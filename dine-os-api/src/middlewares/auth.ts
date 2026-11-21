import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

export type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    tenantId: string | null;
    role: string;
    email?: string;
    phone?: string;
  };
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!rawToken) {
    return res.status(401).json({ message: "Authentication token required." });
  }

  try {
    const payload = verifyToken(rawToken);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: "This account is not attached to a tenant." });
  }
  return next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }
    return next();
  };
}
