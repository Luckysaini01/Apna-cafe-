import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthTokenPayload = {
  userId: string;
  tenantId: string | null;
  role: string;
  email?: string;
  phone?: string;
};

export type TableOrderSessionPayload = {
  tenantId: string;
  tableId: string;
};

export function signToken(payload: AuthTokenPayload) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET as string, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET as string) as AuthTokenPayload;
}

export function signTableOrderSession(payload: TableOrderSessionPayload) {
  return jwt.sign(
    { ...payload, tokenType: "TABLE_ORDER_SESSION" },
    env.JWT_SECRET,
    { expiresIn: "2h" },
  );
}

export function verifyTableOrderSession(token: string): TableOrderSessionPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof payload === "string" ||
    payload.tokenType !== "TABLE_ORDER_SESSION" ||
    typeof payload.tenantId !== "string" ||
    typeof payload.tableId !== "string"
  ) {
    throw new Error("Invalid table order session.");
  }

  return { tenantId: payload.tenantId, tableId: payload.tableId };
}
