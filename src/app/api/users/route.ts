import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireRole } from "@/services/auth";

const assignable = z.enum(["ADMIN", "SUPPORT", "TV"]);
const editable = z.enum(["SUPERADMIN", "ADMIN", "SUPPORT", "TV"]);
const createSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
  role: assignable,
  active: z.boolean().default(true),
});
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.string().email("Informe um e-mail válido."),
  role: editable,
  active: z.boolean(),
  password: z
    .string()
    .min(8, "A nova senha precisa ter ao menos 8 caracteres.")
    .optional()
    .or(z.literal("")),
});

function message(error: unknown, fallback: string) {
  return error instanceof z.ZodError
    ? error.issues[0]?.message || fallback
    : fallback;
}

export async function GET() {
  await requireRole("SUPERADMIN");
  return NextResponse.json(
    await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    }),
  );
}

export async function POST(request: Request) {
  await requireRole("SUPERADMIN");
  try {
    const payload = createSchema.parse(await request.json());
    const user = await prisma.user.create({
      data: { ...payload, passwordHash: await hashPassword(payload.password) },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: message(
          error,
          "Não foi possível criar a conta. Esse e-mail pode já estar em uso.",
        ),
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  await requireRole("SUPERADMIN");
  try {
    const payload = updateSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: payload.id },
      data: {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        active: payload.active,
        ...(payload.password
          ? { passwordHash: await hashPassword(payload.password) }
          : {}),
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      {
        message: message(
          error,
          "Não foi possível salvar. Verifique se o e-mail não está em uso por outra conta.",
        ),
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const currentUser = await requireRole("SUPERADMIN");
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");

  if (!id) {
    return NextResponse.json({ message: "Usuário inválido." }, { status: 400 });
  }
  if (id === currentUser.id) {
    return NextResponse.json(
      { message: "Você não pode remover a sua própria conta." },
      { status: 400 },
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    if (target.role === "SUPERADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPERADMIN", active: true },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { message: "Mantenha pelo menos um superadmin ativo no sistema." },
          { status: 400 },
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível remover o usuário." },
      { status: 500 },
    );
  }
}
