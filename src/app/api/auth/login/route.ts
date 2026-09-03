import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/services/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, role: user.role });
    const isTV = user.role === "TV";
    const sessionId = await createSession(user.id, isTV);
    response.cookies.set({
      name: "vavive_session",
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: isTV ? 60 * 60 * 24 * 3650 : 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Erro interno ao autenticar." }, { status: 500 });
  }
}
