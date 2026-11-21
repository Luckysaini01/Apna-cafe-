import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import {
  requireAuth,
  requireRole,
  requireTenant,
  type AuthenticatedRequest,
} from "../../middlewares/auth.js";
import { emitTenantEvent } from "../../realtime/socket.js";

const router = Router();

router.patch(
  "/orders/:id/mark-paid",
  requireAuth,
  requireTenant,
  requireRole("OWNER", "MANAGER", "WAITER"),
  async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      method: z.enum(["CASH", "UPI"]),
      upiTxnRef: z.string().trim().max(100).optional(),
    });

    try {
      const { method, upiTxnRef } = schema.parse(req.body);
      const tenantId = req.user!.tenantId!;
      const orderId = req.params.id;
      if (typeof orderId !== "string") {
        return res.status(400).json({ message: "Invalid order ID." });
      }
      const updatedOrder = await prisma.$transaction(async (transaction) => {
        const currentOrder = await transaction.order.findFirst({
          where: { id: orderId, tenantId },
          select: { total: true, status: true, completedAt: true },
        });
        if (!currentOrder) return null;

        const completedAt = currentOrder.completedAt ?? new Date();
        const updateResult = await transaction.order.updateMany({
          where: {
            id: orderId,
            tenantId,
            paymentStatus: "UNPAID",
            status: { not: "CANCELLED" },
          },
          data: { paymentStatus: "PAID", status: "COMPLETED", completedAt },
        });

        if (updateResult.count === 0) return null;

        await transaction.payment.create({
          data: {
            tenantId,
            orderId,
            method,
            amount: currentOrder.total,
            status: "PAID",
            upiTxnRef: method === "UPI" ? upiTxnRef : undefined,
            markedById: req.user!.userId,
            markedAt: new Date(),
          },
        });

        await transaction.orderItem.updateMany({
          where: { orderId },
          data: { status: "COMPLETED" },
        });

        if (currentOrder.status !== "COMPLETED") {
          await transaction.orderStatusLog.create({
            data: {
              orderId,
              fromStatus: currentOrder.status,
              toStatus: "COMPLETED",
              changedBy: req.user!.userId,
              note: "Marked paid and complete from the dashboard.",
            },
          });
        }

        return transaction.order.findFirst({
          where: { id: orderId, tenantId },
          include: {
            items: true,
            table: { select: { number: true } },
          },
        });
      });

      if (!updatedOrder) {
        const existingOrder = await prisma.order.findFirst({
          where: { id: orderId, tenantId },
          select: { paymentStatus: true, status: true },
        });

        if (!existingOrder) return res.status(404).json({ message: "Order not found." });
        if (existingOrder.status === "CANCELLED") {
          return res.status(409).json({ message: "Cancelled orders cannot be marked paid." });
        }
        return res.status(409).json({ message: "This order is already paid." });
      }

      emitTenantEvent(tenantId, "payment.marked_paid", {
        orderId,
        method,
      });
      return res.json({ order: updatedOrder });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Choose CASH or UPI as the payment method." });
      }
      console.error("Unable to mark order paid.", error);
      return res.status(500).json({ message: "Unable to mark this order paid." });
    }
  },
);

export default router;
