import { NextResponse } from "next/server";
import { getSessionUser, hasAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import { createLive, listLives } from "@/services/lives";

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

export async function GET(request: Request) {
  const access = await requireLivesAccess();
  if (access.error) return access.error;
  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await listLives({
      search: searchParams.get("search") || undefined,
      period:
        (searchParams.get("period") as
          "current_month" | "previous_month" | "last_30_days" | "all" | null) ??
        undefined,
      hostUserId: searchParams.get("hostUserId") || undefined,
      status:
        (searchParams.get("status") as
          "scheduled" | "completed" | "all" | null) ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  const access = await requireLivesAccess();
  if (access.error) return access.error;
  try {
    const live = await createLive(await request.json(), access.user.id);
    return NextResponse.json(live, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a Live.",
      },
      { status: 400 },
    );
  }
}
