import { Router } from "express";
import { prisma } from "../../db/client.js";
import { emitTenantEvent } from "../../realtime/socket.js";
import {
  requireAuth,
  requireRole,
  requireTenant,
  type AuthenticatedRequest,
} from "../../middlewares/auth.js";

const router = Router();
const activeOrderStatuses = ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] as const;

function getTodayInIndiaRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const indiaOffsetMinutes = 330;
  const start = new Date(Date.UTC(year, month - 1, day) - indiaOffsetMinutes * 60_000);

  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}

router.get(
  "/",
  requireAuth,
  requireTenant,
  requireRole("OWNER", "MANAGER", "WAITER"),
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId!;
    const { start, end } = getTodayInIndiaRange();

    try {
      // Keep each dashboard refresh within the small connection pool used by Neon.
      const [tenant, ordersToday, pendingOrders, completedToday] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, slug: true, taxPercent: true },
        }),
        prisma.order.count({
          where: { tenantId, placedAt: { gte: start, lt: end } },
        }),
        prisma.order.count({ where: { tenantId, status: "PENDING" } }),
        prisma.order.count({
          where: { tenantId, status: "COMPLETED", completedAt: { gte: start, lt: end } },
        }),
      ]);
      const [paidByMethod, activeTables, pendingWaiterCalls, unpaidOrdersCount] = await Promise.all([
        prisma.payment.groupBy({
          by: ["method"],
          where: {
            tenantId,
            status: "PAID",
            markedAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
        prisma.table.findMany({
          where: {
            tenantId,
            isActive: true,
            orders: { some: { tenantId, status: { in: [...activeOrderStatuses] } } },
          },
          select: { id: true, number: true },
          orderBy: { number: "asc" },
        }),
        prisma.waiterCall.count({ where: { tenantId, status: "PENDING" } }),
        prisma.order.count({
          where: { tenantId, paymentStatus: "UNPAID", status: { not: "CANCELLED" } },
        }),
      ]);
      const [unpaidOrdersList, recentOrders, pendingOrderList, activeTablesCount] = await Promise.all([
        prisma.order.findMany({
          where: { tenantId, paymentStatus: "UNPAID", status: { not: "CANCELLED" } },
          orderBy: { placedAt: "desc" },
          take: 8,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            placedAt: true,
            table: { select: { number: true } },
            items: { select: { nameSnapshot: true, quantity: true } },
          },
        }),
        prisma.order.findMany({
          where: { tenantId, placedAt: { gte: start, lt: end } },
          orderBy: { placedAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            placedAt: true,
            table: { select: { number: true } },
            items: { select: { nameSnapshot: true, quantity: true } },
          },
        }),
        prisma.order.findMany({
          where: { tenantId, status: "PENDING" },
          orderBy: { placedAt: "asc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            placedAt: true,
            table: { select: { number: true } },
            items: { select: { nameSnapshot: true, quantity: true } },
          },
        }),
        prisma.table.count({ where: { tenantId, isActive: true } }),
      ]);

      if (!tenant) {
        return res.status(404).json({ message: "Restaurant not found." });
      }

      const collectedByMethod = Object.fromEntries(
        paidByMethod.map(({ method, _sum }) => [method, Number(_sum.amount ?? 0)]),
      );
      const cashCollectedToday = collectedByMethod.CASH ?? 0;
      const upiCollectedToday = collectedByMethod.UPI ?? 0;

      return res.json({
        tenant,
        summary: {
          ordersToday,
          pendingOrders,
          completedToday,
          salesToday: paidByMethod.reduce((sum, entry) => sum + Number(entry._sum.amount ?? 0), 0),
          cashCollectedToday,
          upiCollectedToday,
          occupiedTables: activeTables.length,
          activeTables: activeTablesCount,
          pendingWaiterCalls,
          unpaidOrders: unpaidOrdersCount,
        },
        occupiedTableNumbers: activeTables.map((table) => table.number),
        unpaidOrders: unpaidOrdersList,
        recentOrders,
        pendingOrderList,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Unable to load admin dashboard.", error);
      return res.status(500).json({ message: "Unable to load dashboard data." });
    }
  },
);

router.patch(
  "/orders/:orderId/complete",
  requireAuth,
  requireTenant,
  requireRole("OWNER", "MANAGER", "WAITER"),
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId!;
    const orderId = req.params.orderId;
    if (typeof orderId !== "string") {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    try {
      const result = await prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id: orderId, tenantId },
          select: { id: true, status: true },
        });
        if (!order) return { error: "Order not found.", status: 404 } as const;
        if (order.status === "COMPLETED") {
          return { error: "This order is already complete.", status: 409 } as const;
        }
        if (order.status === "CANCELLED") {
          return { error: "Cancelled orders cannot be completed.", status: 409 } as const;
        }

        const completedAt = new Date();
        const updateResult = await transaction.order.updateMany({
          where: { id: order.id, tenantId, status: order.status },
          data: { status: "COMPLETED", completedAt },
        });
        if (updateResult.count === 0) {
          return { error: "This order changed. Refresh and try again.", status: 409 } as const;
        }

        await transaction.orderItem.updateMany({
          where: { orderId: order.id },
          data: { status: "COMPLETED" },
        });
        await transaction.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "COMPLETED",
            changedBy: req.user!.userId,
            note: "Marked complete from the dashboard.",
          },
        });

        return { orderId: order.id } as const;
      });

      if ("error" in result) {
        const errorStatus = typeof result.status === "number" ? result.status : 500;
        return res.status(errorStatus).json({ message: result.error });
      }

      emitTenantEvent(tenantId, "dashboard.updated", {
        type: "order.completed",
        orderId: result.orderId,
      });
      return res.json({ message: "Order marked complete." });
    } catch (error) {
      console.error("Unable to complete order from the dashboard.", error);
      return res.status(500).json({ message: "Unable to complete this order." });
    }
  },
);

export default router;
