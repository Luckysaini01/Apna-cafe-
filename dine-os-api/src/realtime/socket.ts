import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { allowedOrigins } from "../config/env.js";
import { verifyToken } from "../lib/jwt.js";

type TenantEvent =
  | "order.created"
  | "waiter.called"
  | "payment.marked_paid"
  | "dashboard.updated";

let io: Server | null = null;

export function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string" || !token) {
      next(new Error("Authentication required."));
      return;
    }

    try {
      const user = verifyToken(token);
      if (!user.tenantId || !["OWNER", "MANAGER", "WAITER"].includes(user.role)) {
        next(new Error("Not authorized for dashboard updates."));
        return;
      }

      socket.data.tenantId = user.tenantId;
      next();
    } catch {
      next(new Error("Invalid or expired authentication token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`tenant:${socket.data.tenantId}`);
  });

  return io;
}

export function emitTenantEvent(tenantId: string, event: TenantEvent, data: unknown) {
  io?.to(`tenant:${tenantId}`).emit(event, data);
  if (event !== "dashboard.updated") {
    io?.to(`tenant:${tenantId}`).emit("dashboard.updated", { type: event });
  }
}
