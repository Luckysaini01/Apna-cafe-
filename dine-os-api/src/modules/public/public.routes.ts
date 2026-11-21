import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { menuSeed } from "../../db/menu-data.js";
import { signTableOrderSession, verifyTableOrderSession } from "../../lib/jwt.js";
import { emitTenantEvent } from "../../realtime/socket.js";

const router = Router();

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "PrismaClientInitializationError" ||
      error.message.includes("Can't reach database server"))
  );
}

router.get("/:slug/tables", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, isActive: true },
    });
    if (!tenant?.isActive) return res.status(404).json({ message: "Restaurant not found." });

    const tables = await prisma.table.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, number: true },
      orderBy: { number: "asc" },
    });

    return res.json({ tables });
  } catch (error) {
    console.error("Unable to load public table list.", error);
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({
        message: "Restaurant database is unavailable. Configure DATABASE_URL and connect PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Unable to load available tables." });
  }
});

router.get("/:slug/menu", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, isActive: true, taxPercent: true },
    });
    if (!tenant?.isActive) return res.status(404).json({ message: "Restaurant not found." });

    const categories = await prisma.menuCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });

    return res.json({
      tenant: { taxPercent: tenant.taxPercent },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        icon: "🍽️",
      })),
      items: categories.flatMap((category) =>
        category.items.map((item) => ({
          id: item.id,
          category: category.id,
          categoryName: category.name,
          name: item.name,
          desc: item.description ?? "",
          price: Number(item.price),
          imageUrl: item.imageUrl,
          emoji: "🍽️",
          foodType: item.foodType,
          source: "database",
        })),
      ),
    });
  } catch (error) {
    console.error("Unable to load the public menu.", error);
    return res.status(500).json({ message: "Unable to load the menu." });
  }
});

router.post("/:slug/table-session", async (req, res) => {
  const schema = z.object({ tableNumber: z.string().trim().min(1).max(20) });
  try {
    const { tableNumber } = schema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, isActive: true },
    });
    if (!tenant?.isActive) return res.status(404).json({ message: "Restaurant not found." });

    const table = await prisma.table.findFirst({
      where: { tenantId: tenant.id, number: tableNumber, isActive: true },
      select: { id: true, number: true },
    });
    if (!table) return res.status(404).json({ message: "This table is unavailable." });

    return res.json({
      table,
      tableSession: signTableOrderSession({ tenantId: tenant.id, tableId: table.id }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Choose a valid table number." });
    }
    console.error("Unable to start public table session.", error);
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({
        message: "Restaurant database is unavailable. Configure DATABASE_URL and connect PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Unable to open this table." });
  }
});

router.get("/:slug/table/:qrToken", async (req, res) => {
  const { slug, qrToken } = req.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      tables: { where: { qrToken, isActive: true } },
      settings: true,
    },
  });

  if (!tenant?.isActive || tenant.tables.length === 0) {
    return res.status(404).json({ message: "Table not found." });
  }

  const table = tenant.tables[0];
  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } },
  });

  return res.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      phone: tenant.phone,
      address: tenant.address,
      upiId: tenant.upiId,
      upiName: tenant.upiName,
      taxPercent: tenant.taxPercent,
      settings: tenant.settings,
    },
    table: {
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      qrToken: table.qrToken,
    },
    menu: categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        categoryName: category.name,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        foodType: item.foodType,
      })),
    })),
  });
});

router.post("/:slug/orders", async (req, res) => {
  const itemSchema = z.object({
    menuItemId: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  }).refine((item) => Boolean(item.menuItemId) !== Boolean(item.sku), {
    message: "Provide either a menu item ID or a menu SKU.",
  });
  const schema = z.object({
    qrToken: z.string().min(1).optional(),
    tableSession: z.string().min(1).optional(),
    note: z.string().optional(),
    items: z.array(itemSchema).min(1),
  }).refine((payload) => Boolean(payload.qrToken) !== Boolean(payload.tableSession), {
    message: "Provide either a table QR token or a table selection session.",
  });

  try {
    const { slug } = req.params;
    const payload = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        taxPercent: true,
        isActive: true,
        upiId: true,
        upiName: true,
        settings: { select: { allowUpiPayment: true } },
      },
    });
    if (!tenant?.isActive) return res.status(404).json({ message: "Restaurant not found." });

    let table;
    if (payload.qrToken) {
      table = await prisma.table.findFirst({
        where: { tenantId: tenant.id, qrToken: payload.qrToken, isActive: true },
        select: { id: true, number: true },
      });
    } else {
      let tableSession;
      try {
        tableSession = verifyTableOrderSession(payload.tableSession!);
      } catch {
        return res.status(401).json({ message: "Table session expired. Choose your table again." });
      }

      if (tableSession.tenantId !== tenant.id) {
        return res.status(404).json({ message: "Table not found." });
      }
      table = await prisma.table.findFirst({
        where: { id: tableSession.tableId, tenantId: tenant.id, isActive: true },
        select: { id: true, number: true },
      });
    }
    if (!table) return res.status(404).json({ message: "Table not found." });

    const menuItemIds = payload.items.flatMap((item) => item.menuItemId ? [item.menuItemId] : []);
    const requestedSkus = payload.items.flatMap((item) => item.sku ? [item.sku] : []);
    const seededItems = requestedSkus.map((sku) => menuSeed.find((item) => item.sku === sku));
    if (seededItems.some((item) => !item)) {
      return res.status(400).json({ message: "One or more menu items are invalid." });
    }

    const itemNames = seededItems.flatMap((item) => item ? [item.name] : []);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        tenantId: tenant.id,
        isAvailable: true,
        OR: [
          ...(menuItemIds.length > 0 ? [{ id: { in: menuItemIds } }] : []),
          ...(itemNames.length > 0 ? [{ name: { in: itemNames } }] : []),
        ],
      },
    });

    const resolvedItems = payload.items.map((item) => {
      if (item.menuItemId) {
        return { request: item, menuItem: menuItems.find((menuItem) => menuItem.id === item.menuItemId) };
      }

      const seedItem = menuSeed.find((entry) => entry.sku === item.sku);
      const matchingItems = menuItems.filter((menuItem) => menuItem.name === seedItem?.name);
      return { request: item, menuItem: matchingItems.length === 1 ? matchingItems[0] : undefined };
    });

    if (resolvedItems.some((item) => !item.menuItem)) {
      return res.status(400).json({ message: "One or more menu items are unavailable." });
    }

    const subtotalPaise = resolvedItems.reduce((sum, item) => {
      return sum + Math.round(Number(item.menuItem!.price) * 100) * item.request.quantity;
    }, 0);
    const subtotal = subtotalPaise / 100;
    const taxAmount = Math.round((subtotalPaise * tenant.taxPercent) / 100) / 100;
    const total = subtotal + taxAmount;

    const orderNumber = (await prisma.order.count({ where: { tenantId: tenant.id } })) + 1;

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        tableId: table.id,
        orderNumber,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        notes: payload.note,
        items: {
          create: resolvedItems.map(({ request, menuItem }) => {
            return {
              menuItemId: menuItem!.id,
              nameSnapshot: menuItem!.name,
              priceSnapshot: menuItem!.price,
              quantity: request.quantity,
              notes: request.notes ?? undefined,
              status: "PENDING",
            };
          }),
        },
      },
      include: { items: true, table: { select: { number: true } } },
    });

    emitTenantEvent(tenant.id, "order.created", { order });
    return res.status(201).json({
      order,
      payment: {
        upiId: tenant.upiId,
        upiName: tenant.upiName,
        allowUpiPayment: tenant.settings?.allowUpiPayment ?? true,
      },
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    if (status === 500) console.error("Unable to create public order.", error);
    return res.status(status).json({ message: status === 400 ? "Invalid order details." : "Unable to create order." });
  }
});

router.get("/orders/:orderId", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { items: true, table: true },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  return res.json({ order });
});

router.post("/:slug/waiter-call", async (req, res) => {
  const schema = z.object({ tableId: z.string().min(1), reason: z.string().optional() });
  try {
    const { slug } = req.params;
    const { tableId, reason } = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    const call = await prisma.waiterCall.create({
      data: {
        tenantId: tenant.id,
        tableId,
        reason: reason ?? "ASSISTANCE",
        status: "PENDING",
      },
    });

    emitTenantEvent(tenant.id, "waiter.called", { call });
    return res.status(201).json({ call });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place waiter call.";
    return res.status(400).json({ message });
  }
});

export default router;
