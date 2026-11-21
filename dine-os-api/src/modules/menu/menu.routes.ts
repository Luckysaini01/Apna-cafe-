import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { emitTenantEvent } from "../../realtime/socket.js";
import {
  requireAuth,
  requireRole,
  requireTenant,
  type AuthenticatedRequest,
} from "../../middlewares/auth.js";

const router = Router();
const foodTypes = ["VEG", "NONVEG", "EGG", "VEGAN"] as const;
const categorySelection = { id: true, name: true } as const;
const menuImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"));

const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  categoryName: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: menuImageUrlSchema.nullable().optional(),
  price: z.coerce.number().finite().positive(),
  foodType: z.enum(foodTypes),
});

const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  isAvailable: z.boolean().optional(),
}).refine((item) => Object.keys(item).length > 0, {
  message: "Provide at least one menu item field to update.",
});

async function findOrCreateCategory(
  transaction: Prisma.TransactionClient,
  tenantId: string,
  name: string,
) {
  const existing = await transaction.menuCategory.findFirst({
    where: { tenantId, name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    return existing.isActive
      ? existing
      : transaction.menuCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
  }

  const sortOrder = await transaction.menuCategory.count({ where: { tenantId } });
  return transaction.menuCategory.create({
    data: { tenantId, name, sortOrder },
  });
}

function serializeMenuItem<
  T extends { price: Prisma.Decimal; category: { id: string; name: string } },
>(item: T) {
  return { ...item, price: Number(item.price) };
}

router.use(requireAuth, requireTenant, requireRole("OWNER", "MANAGER"));

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { tenantId: req.user!.tenantId! },
      include: { category: { select: categorySelection } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return res.json({ items: items.map(serializeMenuItem) });
  } catch (error) {
    console.error("Unable to load menu items for the dashboard.", error);
    return res.status(500).json({ message: "Unable to load menu items." });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const input = createMenuItemSchema.parse(req.body);
    const tenantId = req.user!.tenantId!;
    const item = await prisma.$transaction(async (transaction) => {
      const category = await findOrCreateCategory(transaction, tenantId, input.categoryName);
      const sortOrder = await transaction.menuItem.count({
        where: { tenantId, categoryId: category.id },
      });

      return transaction.menuItem.create({
        data: {
          tenantId,
          categoryId: category.id,
          name: input.name,
          description: input.description?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          price: input.price,
          foodType: input.foodType,
          sortOrder,
        },
        include: { category: { select: categorySelection } },
      });
    });

    emitTenantEvent(tenantId, "dashboard.updated", { type: "menu.created", itemId: item.id });
    return res.status(201).json({ item: serializeMenuItem(item) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Enter a name, category, valid price, and food type." });
    }
    console.error("Unable to create menu item.", error);
    return res.status(500).json({ message: "Unable to add this menu item." });
  }
});

router.patch("/:itemId", async (req: AuthenticatedRequest, res) => {
  try {
    const input = updateMenuItemSchema.parse(req.body);
    const tenantId = req.user!.tenantId!;
    const itemId = req.params.itemId;
    if (typeof itemId !== "string") {
      return res.status(400).json({ message: "Invalid menu item ID." });
    }
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, tenantId },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: "Menu item not found." });

    const item = await prisma.$transaction(async (transaction) => {
      const category = input.categoryName
        ? await findOrCreateCategory(transaction, tenantId, input.categoryName)
        : undefined;

      return transaction.menuItem.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.imageUrl !== undefined
            ? { imageUrl: input.imageUrl?.trim() || null }
            : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.foodType !== undefined ? { foodType: input.foodType } : {}),
          ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
          ...(category ? { categoryId: category.id } : {}),
        },
        include: { category: { select: categorySelection } },
      });
    });

    emitTenantEvent(tenantId, "dashboard.updated", { type: "menu.updated", itemId: item.id });
    return res.json({ item: serializeMenuItem(item) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Enter valid menu item details." });
    }
    console.error("Unable to update menu item.", error);
    return res.status(500).json({ message: "Unable to update this menu item." });
  }
});

router.delete("/:itemId", async (req: AuthenticatedRequest, res) => {
  try {
    const itemId = req.params.itemId;
    if (typeof itemId !== "string") {
      return res.status(400).json({ message: "Invalid menu item ID." });
    }
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, tenantId: req.user!.tenantId! },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: "Menu item not found." });

    const item = await prisma.menuItem.update({
      where: { id: existing.id },
      data: { isAvailable: false },
      include: { category: { select: categorySelection } },
    });

    emitTenantEvent(req.user!.tenantId!, "dashboard.updated", { type: "menu.updated", itemId: item.id });
    return res.json({ item: serializeMenuItem(item) });
  } catch (error) {
    console.error("Unable to remove menu item.", error);
    return res.status(500).json({ message: "Unable to remove this menu item." });
  }
});

export default router;
