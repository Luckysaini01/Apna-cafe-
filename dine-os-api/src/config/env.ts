import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("12h"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  TENANT_NAME: z.string().default("Apna Cafe"),
  TENANT_SLUG: z.string().regex(/^[a-z0-9-]+$/).default("apna-cafe"),
  TENANT_UPI_ID: z.string().optional().default(""),
  TENANT_UPI_NAME: z.string().optional().default(""),
  ADMIN_SECRET_KEY: z.string().min(8).default("change-this-before-deploying"),
  OWNER_EMAIL: z.string().email().default("owner@example.com"),
  OWNER_PASSWORD: z.string().min(12).default("change-this-before-deploying"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);

export const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (env.NODE_ENV === "production") {
  const errors: string[] = [];

  if (/change[-_ ]?me|change-this|replace-with/i.test(env.OWNER_PASSWORD)) {
    errors.push("Set OWNER_PASSWORD to a unique secret.");
  }
  if (
    env.ADMIN_SECRET_KEY.length < 32 ||
    /change[-_ ]?me|change-this|replace-with/i.test(env.ADMIN_SECRET_KEY)
  ) {
    errors.push("Set ADMIN_SECRET_KEY to a unique secret with at least 32 characters.");
  }
  if (/change[-_ ]?me|change-this|replace-with/i.test(env.JWT_SECRET)) {
    errors.push("Set JWT_SECRET to a unique random secret.");
  }
  if (env.OWNER_EMAIL === "owner@example.com") {
    errors.push("Set OWNER_EMAIL to the cafe owner's email address.");
  }
  if (/localhost|127\.0\.0\.1|user:password/i.test(env.DATABASE_URL)) {
    errors.push("Set DATABASE_URL to the hosted production database.");
  }
  if (allowedOrigins.length === 0) {
    errors.push("Set ALLOWED_ORIGINS to the production website origin.");
  }
  if (
    allowedOrigins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.protocol !== "https:" ||
          url.origin !== origin ||
          /\.invalid$|your-domain/i.test(url.hostname)
        );
      } catch {
        return true;
      }
    })
  ) {
    errors.push("ALLOWED_ORIGINS must contain exact HTTPS origins in production.");
  }

  if (errors.length > 0) {
    throw new Error(`Production configuration is incomplete: ${errors.join(" ")}`);
  }
}
