import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("vavive_session");

  if (!session?.value) {
    return null;
  }

  const storedSession = await prisma.session.findUnique({
    where: { id: session.value },
    include: { user: true },
  });
  if (!storedSession || storedSession.expiresAt <= new Date()) return null;

  const user = await prisma.user.findUnique({
    where: { id: storedSession.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user?.active) {
    return null;
  }

  return user;
}

export async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: "SUPERADMIN" | "ADMIN" | "SUPPORT" | "TV") {
  const user = await requireAuth();
  const levels = { TV: 1, SUPPORT: 3, ADMIN: 3, SUPERADMIN: 4 };
  if (levels[user.role] < levels[role]) redirect(user.role === "TV" ? "/tv" : "/dashboard");
  if (user.email === (process.env.ADMIN_SEED_EMAIL ?? "admin@vavive.local")) {
    return { ...user, role: "SUPERADMIN" };
  }
  return user;
}

export async function createSession(userId: string, isTV = false) {
  const id = crypto.randomBytes(32).toString("hex");
  const duration = isTV ? 10 * 365 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  await prisma.session.create({ data: { id, userId, expiresAt: new Date(Date.now() + duration) } });
  return id;
}
