import type { OrderStatus, Role } from "@prisma/client";

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  OWNER: ["orders:read", "orders:update", "tables:read", "tables:write", "menu:read"],
  MANAGER: ["orders:read", "orders:update", "tables:read", "menu:read"],
  WAITER: ["orders:read", "orders:update", "tables:read"],
  KITCHEN: ["orders:read", "orders:update"],
  CUSTOMER: ["orders:read"],
};
