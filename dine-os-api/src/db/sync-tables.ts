import "dotenv/config";
import { prisma } from "./client.js";

const activeTableNumbers = ["1", "2", "3", "4"];

async function syncTables() {
  const tenantSlug = process.env.TENANT_SLUG?.trim() || "apna-cafe";

  const result = await prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new Error(`Tenant "${tenantSlug}" was not found.`);
    }

    for (const number of activeTableNumbers) {
      await transaction.table.upsert({
        where: { tenantId_number: { tenantId: tenant.id, number } },
        update: { isActive: true },
        create: { tenantId: tenant.id, number, capacity: 4 },
      });
    }

    const deactivated = await transaction.table.updateMany({
      where: {
        tenantId: tenant.id,
        number: { notIn: activeTableNumbers },
        isActive: true,
      },
      data: { isActive: false },
    });

    return { tenantName: tenant.name, deactivatedCount: deactivated.count };
  });

  console.log(
    `Activated Tables 1–4 for ${result.tenantName}; deactivated ${result.deactivatedCount} other table(s).`,
  );
}

syncTables()
  .catch((error: unknown) => {
    console.error("Table sync failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
