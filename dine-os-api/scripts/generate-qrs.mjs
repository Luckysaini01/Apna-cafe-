import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PrismaClient } from "@prisma/client";

function getBaseUrl() {
  const flagIndex = process.argv.indexOf("--base-url");
  const baseUrl = flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;

  if (!baseUrl) {
    throw new Error(
      "Provide the deployed site URL, e.g. npm run generate:qrs -- --base-url https://apnacafe.in",
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The base URL must use http or https.");
  }
  if (parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    throw new Error("The base URL must not include a path, query, or fragment.");
  }

  return parsedUrl.origin;
}

async function main() {
  const baseUrl = getBaseUrl();
  const prisma = new PrismaClient();

  try {
    const tables = await prisma.table.findMany({
      where: {
        isActive: true,
        tenant: { slug: process.env.TENANT_SLUG ?? "apna-cafe", isActive: true },
      },
      select: {
        number: true,
        qrToken: true,
        tenant: { select: { slug: true } },
      },
      orderBy: { number: "asc" },
    });

    if (tables.length === 0) {
      throw new Error("No active tables found. Seed the restaurant database first.");
    }

    const outputDir = path.resolve(process.cwd(), "..", "public", "qr");
    await fs.mkdir(outputDir, { recursive: true });

    await Promise.all(
      tables.map(async (table) => {
        const outputPath = path.join(outputDir, `table-${table.number}.png`);
        const url = new URL("/order", baseUrl);
        url.searchParams.set("t", table.qrToken);
        url.searchParams.set("s", table.tenant.slug);

        await QRCode.toFile(outputPath, url.toString(), {
          width: 500,
          margin: 2,
          color: { dark: "#6B4226", light: "#FFF8E7" },
        });

        console.log(`Generated ${outputPath} for Table ${table.number}.`);
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Could not generate table QR codes.", error);
  process.exitCode = 1;
});
