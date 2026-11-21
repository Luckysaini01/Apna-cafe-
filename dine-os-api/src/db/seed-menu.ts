import "dotenv/config";
import { prisma } from "./client.js";
import { menuSeed } from "./menu-data.js";

async function seedMenu() {
  const tenantSlug = process.env.TENANT_SLUG?.trim() || "apna-cafe";

  const result = await prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new Error(`Tenant "${tenantSlug}" was not found.`);
    }

    const [categoryCount, itemCount] = await Promise.all([
      transaction.menuCategory.count({ where: { tenantId: tenant.id } }),
      transaction.menuItem.count({ where: { tenantId: tenant.id } }),
    ]);

    if (categoryCount > 0 || itemCount > 0) {
      throw new Error(
        `Refusing to seed "${tenantSlug}": the menu already contains ${categoryCount} categories and ${itemCount} items.`,
      );
    }

    const categoryNames = [...new Set(menuSeed.map((item) => item.category))];
    const categoryIds = new Map<string, string>();

    for (const [sortOrder, name] of categoryNames.entries()) {
      const category = await transaction.menuCategory.create({
        data: { tenantId: tenant.id, name, sortOrder },
        select: { id: true },
      });
      categoryIds.set(name, category.id);
    }

    const itemSortOrders = new Map<string, number>();
    await transaction.menuItem.createMany({
      data: menuSeed.map((item) => {
        const categoryId = categoryIds.get(item.category);
        if (!categoryId) {
          throw new Error(`Category "${item.category}" was not created.`);
        }

        const sortOrder = itemSortOrders.get(item.category) ?? 0;
        itemSortOrders.set(item.category, sortOrder + 1);

        return {
          tenantId: tenant.id,
          categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          foodType: "VEG" as const,
          isAvailable: true,
          sortOrder,
        };
      }),
    });

    return { tenantName: tenant.name, categoryCount: categoryNames.length };
  }, { timeout: 15000 });

  console.log(
    `Added ${menuSeed.length} menu items across ${result.categoryCount} categories for ${result.tenantName}.`,
  );
}

seedMenu()
  .catch((error: unknown) => {
    console.error("Menu seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
