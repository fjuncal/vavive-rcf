import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];
export const OPERATIONS_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN", "SUPPORT"];
export const TV_ACCESS_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN", "SUPPORT", "TV"];
export async function hashPassword(password: string) { return bcrypt.hash(password, 10); }
export async function verifyPassword(password: string, passwordHash: string) { return bcrypt.compare(password, passwordHash); }
export function hasAnyRole(user: Pick<User, "role">, allowedRoles: readonly UserRole[]) { return allowedRoles.includes(user.role); }
export async function getSessionUser() { const sessionId = (await cookies()).get("vavive_session")?.value; if (!sessionId) return null; const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } }); if (!session || session.expiresAt <= new Date() || !session.user.active) return null; return session.user; }
export async function requireAuth() { const user = await getSessionUser(); if (!user) redirect("/login"); return user; }
export async function requireAnyRole(allowedRoles: readonly UserRole[]) { const user = await requireAuth(); if (!hasAnyRole(user, allowedRoles)) redirect(user.role === "TV" ? "/tv" : "/dashboard"); return user; }
export async function requireRole(role: UserRole) { return requireAnyRole([role]); }
export async function createSession(userId: string, isTV = false) { const id = crypto.randomBytes(32).toString("hex"); const duration = isTV ? 180 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000; await prisma.session.create({ data: { id, userId, expiresAt: new Date(Date.now() + duration) } }); return id; }
