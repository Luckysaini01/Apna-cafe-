import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { allowedOrigins, env } from "./config/env.js";
import authRouter from "./modules/auth/auth.routes.js";
import publicRouter from "./modules/public/public.routes.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import menuRouter from "./modules/menu/menu.routes.js";
import paymentsRouter from "./modules/payments/payments.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "dine-os-api",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/v1/auth", authRouter);
  app.use("/v1/public", publicRouter);
  app.use("/v1/dashboard/menu", menuRouter);
  app.use("/v1/dashboard", dashboardRouter);
  app.use("/v1", paymentsRouter);

  return app;
}
