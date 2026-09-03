import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("vavive_session")?.value;
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: "vavive_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
