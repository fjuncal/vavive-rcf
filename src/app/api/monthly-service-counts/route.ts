import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hasAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import {
  competenceQuerySchema,
  getMonthlyOverview,
} from "@/services/monthly-service-counts";

// Leitura consolidada para /atendimentos: franquias ativas + lançamentos da
// competência e da anterior em lote (sem N+1). Escrita continua nos
// endpoints existentes (POST/PUT mensais por franquia, sem duplicação).
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  if (!hasAnyRole(user, OPERATIONS_ROLES)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  let competence: z.infer<typeof competenceQuerySchema>;
  try {
    competence = competenceQuerySchema.parse({
      year: params.get("year") ?? "",
      month: params.get("month") ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.issues[0]?.message || "Competência inválida."
            : "Competência inválida.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    await getMonthlyOverview(competence.year, competence.month),
  );
}
