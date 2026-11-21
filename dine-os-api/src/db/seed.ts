import { hash } from "bcryptjs";
import { prisma } from "./client.js";
import { menuSeed } from "./menu-data.js";

async function seed() {
  const tenantName = process.env.TENANT_NAME ?? "Apna Cafe";
  const tenantSlug = process.env.TENANT_SLUG ?? "apna-cafe";
  const ownerPhone = process.env.OWNER_PHONE ?? "+919876543210";
  const ownerEmail = (process.env.OWNER_EMAIL ?? "owner@example.com").toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD ?? "change-this-before-deploying";
  const upiId = process.env.TENANT_UPI_ID?.trim() || null;
  const upiName = process.env.TENANT_UPI_NAME?.trim() || tenantName;

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      name: tenantName,
      phone: ownerPhone,
      ...(upiId ? { upiId } : {}),
      ...(process.env.TENANT_UPI_NAME?.trim() ? { upiName } : {}),
    },
    create: {
      name: tenantName,
      slug: tenantSlug,
      phone: ownerPhone,
      upiId: upiId ?? undefined,
      upiName,
      taxPercent: 5,
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: { autoAcceptOrders: true, allowUpiPayment: true, callWaiterEnabled: true },
    create: {
      tenantId: tenant.id,
      autoAcceptOrders: true,
      allowUpiPayment: true,
      callWaiterEnabled: true,
      orderTimeoutMin: 30,
      themeColor: "#FF6B35",
    },
  });

  await prisma.user.upsert({
    where: { phone: ownerPhone },
    update: { name: "Owner", email: ownerEmail, role: "OWNER", isActive: true },
    create: {
      tenantId: tenant.id,
      phone: ownerPhone,
      name: "Owner",
      email: ownerEmail,
      password: await hash(ownerPassword, 12),
      role: "OWNER",
      isActive: true,
    },
  });

  const categoryNames = [...new Set(menuSeed.map((item) => item.category))];
  const categories = new Map<string, string>();

  for (const [sortOrder, name] of categoryNames.entries()) {
    const existingCategory = await prisma.menuCategory.findFirst({
      where: { tenantId: tenant.id, name },
      select: { id: true },
    });

    const category = existingCategory
      ? await prisma.menuCategory.update({
          where: { id: existingCategory.id },
          data: { sortOrder, isActive: true },
        })
      : await prisma.menuCategory.create({
          data: { tenantId: tenant.id, name, sortOrder },
        });

    categories.set(name, category.id);
  }

  for (const item of menuSeed) {
    const categoryId = categories.get(item.category);
    if (!categoryId) continue;

    const existingItem = await prisma.menuItem.findFirst({
      where: { tenantId: tenant.id, name: item.name },
      select: { id: true },
    });

    if (existingItem) {
      await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: {
          categoryId,
          description: item.description,
          price: item.price,
          isAvailable: true,
          foodType: "VEG",
        },
      });
    } else {
      await prisma.menuItem.create({
        data: {
          tenantId: tenant.id,
          categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          foodType: "VEG",
          isAvailable: true,
        },
      });
    }
  }

  for (let number = 1; number <= 4; number += 1) {
    await prisma.table.upsert({
      where: { tenantId_number: { tenantId: tenant.id, number: String(number) } },
      update: { isActive: true },
      create: { tenantId: tenant.id, number: String(number), capacity: 4 },
    });
  }

  console.log(`Seeded ${tenant.name} (${tenant.slug}) with an owner, menu, and 10 tables.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
