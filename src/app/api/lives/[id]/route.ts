import { NextResponse } from "next/server";
import {
  ADMIN_ROLES,
  getSessionUser,
  hasAnyRole,
  OPERATIONS_ROLES,
} from "@/services/auth";
import { deleteLive, getLive, updateLive } from "@/services/lives";

async function requireLivesAccess() {
  const user = await getSessionUser();
  if (!user)
    return {
      error: NextResponse.json(
        { message: "Sessão inválida ou expirada." },
        { status: 401 },
      ),
    };
  if (!hasAnyRole(user, OPERATIONS_ROLES))
    return {
      error: NextResponse.json(
        { message: "Sem permissão para acessar Lives." },
        { status: 403 },
      ),
    };
  return { user };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireLivesAccess();
  if (access.error) return access.error;
  const { id } = await params;
  const live = await getLive(id);
  return live
    ? NextResponse.json(live)
    : NextResponse.json({ message: "Live não encontrada." }, { status: 404 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireLivesAccess();
  if (access.error) return access.error;
  const { id } = await params;
  try {
    return NextResponse.json(await updateLive(id, await request.json()));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível editar a Live.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireLivesAccess();
  if (access.error) return access.error;
  if (!hasAnyRole(access.user, ADMIN_ROLES))
    return NextResponse.json(
      { message: "Somente administradores podem excluir Lives." },
      { status: 403 },
    );
  const { id } = await params;
  try {
    await deleteLive(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a Live.",
      },
      { status: 400 },
    );
  }
}
