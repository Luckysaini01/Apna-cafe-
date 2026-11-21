import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

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
  const outputDir = path.join(process.cwd(), "public", "qr");
  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all(
    Array.from({ length: 10 }, async (_, index) => {
      const tableNumber = index + 1;
      const tableId = `table${tableNumber}`;
      const outputPath = path.join(outputDir, `table-${tableNumber}.png`);

      await QRCode.toFile(outputPath, `${baseUrl}/t/${tableId}`, {
        width: 500,
        margin: 2,
        color: { dark: "#6B4226", light: "#FFF8E7" },
      });

      console.log(`Generated ${outputPath} for ${baseUrl}/t/${tableId}`);
    }),
  );
}

main().catch((error) => {
  console.error("Could not generate table QR codes.", error);
  process.exitCode = 1;
});
