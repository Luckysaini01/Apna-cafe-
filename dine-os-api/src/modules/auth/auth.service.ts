import { compare, hash } from "bcryptjs";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { signToken } from "../../lib/jwt.js";

const otpStore = new Map<string, { code: string; expiresAt: number }>();

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export async function sendOtp(phone: string) {
  if (env.NODE_ENV === "production") {
    throw new Error("OTP delivery is not configured.");
  }

  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 10) {
    throw new Error("Phone number is required.");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(normalized, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  return {
    message: "OTP generated for demo use.",
    phone: normalized,
    otp: code,
  };
}

export async function verifyOtp(phone: string, otp: string) {
  const normalized = normalizePhone(phone);
  const record = otpStore.get(normalized);

  if (!record || Date.now() > record.expiresAt || record.code !== otp) {
    throw new Error("OTP is invalid or has expired.");
  }

  otpStore.delete(normalized);

  let user = await prisma.user.findUnique({ where: { phone: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: "Guest customer",
        role: "CUSTOMER",
        isActive: true,
      },
    });
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId ?? null,
    role: user.role,
    phone: user.phone,
  });

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
}

export async function loginAdmin(secretKey: string) {
  if (!secretKey || secretKey !== env.ADMIN_SECRET_KEY) {
    throw new Error("Invalid admin secret key.");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: env.TENANT_SLUG },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error("Restaurant is not configured yet.");
  }

  const token = signToken({
    userId: tenant.id,
    tenantId: tenant.id,
    role: "OWNER",
    email: env.OWNER_EMAIL,
  });

  return {
    token,
    user: {
      id: tenant.id,
      name: tenant.name,
      email: env.OWNER_EMAIL,
      role: "OWNER",
      tenantId: tenant.id,
    },
  };
}

export async function loginStaff(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.password) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId ?? null,
    role: user.role,
    email: user.email ?? undefined,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
}

export async function createStaffAccount({
  tenantId,
  name,
  email,
  password,
  role,
}: {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "MANAGER" | "WAITER" | "KITCHEN";
}) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new Error("A staff account already exists for this email.");
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      role,
      isActive: true,
    },
  });

  return user;
}
