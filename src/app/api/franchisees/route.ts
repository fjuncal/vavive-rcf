import { NextResponse } from "next/server";
import { z } from "zod";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  unitName: z.string().min(2),
  photoUrl: z.string().url().optional().or(z.literal("")),
  moment: z.enum(["IMPLANTACAO", "INAUGURADA"]),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  await requireAnyRole(OPERATIONS_ROLES);

  try {
    const payload = schema.parse(await request.json());

    const franchisee = await prisma.franchisee.create({
      data: {
        name: payload.name,
        unitName: payload.unitName,
        photoUrl: payload.photoUrl || null,
        moment: payload.moment,
        active: payload.active,
      },
    });

    return NextResponse.json(franchisee, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Dados inválidos." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Erro ao criar franqueado." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  await requireAnyRole(OPERATIONS_ROLES);
  try {
    const body = await request.json();
    const id = String(body.id || "");
    const payload = schema.parse(body);
    const franchisee = await prisma.franchisee.update({
      where: { id },
      data: { ...payload, photoUrl: payload.photoUrl || null },
    });
    return NextResponse.json(franchisee);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: error.issues[0]?.message },
        { status: 400 },
      );
    return NextResponse.json(
      { message: "Erro ao editar franqueado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await requireAnyRole(["SUPERADMIN"]);

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json(
        { message: "Franqueado inválido." },
        { status: 400 },
      );
    }

    await prisma.franchisee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Este franqueado não foi encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Não foi possível remover o franqueado." },
      { status: 500 },
    );
  }
}
