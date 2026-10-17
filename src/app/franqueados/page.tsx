import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { fallbackFranchisees } from "@/lib/fallback-data";
import { FRANCHISE_MOMENT_LABELS, MONTH_LABELS } from "@/lib/constants";
import { formatCivilDate, formatDate } from "@/lib/utils";
import { getDaysWithoutContact } from "@/lib/contact-attention";
import { getSessionUser } from "@/services/auth";
import { DeleteFranchiseeAction } from "@/components/franchisees/delete-franchisee-action";
import { birthdayMatchesMonthDay } from "@/domain/birthdays";

const PAGE_SIZE = 20;
type PageParams = { q?: string; page?: string; birthdayMonth?: string; birthdayDay?: string };

type TableMember = {
  id: string;
  name: string;
  birthDate: Date | null;
  active: boolean;
};

function parseMonth(value?: string) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function parseDay(value?: string) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

function daysForMonth(month: number | null) {
  if (month === 2) return 29;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

async function getBirthdayUnitIds(month: number, day: number | null) {
  const rows = day
    ? await prisma.$queryRaw<Array<{ franchiseeId: string }>>(Prisma.sql`
        SELECT DISTINCT "franchiseeId"
        FROM "franchisee_members"
        WHERE "active" = true
          AND "birthDate" IS NOT NULL
          AND EXTRACT(MONTH FROM "birthDate") = ${month}
          AND EXTRACT(DAY FROM "birthDate") = ${day}
      `)
    : await prisma.$queryRaw<Array<{ franchiseeId: string }>>(Prisma.sql`
        SELECT DISTINCT "franchiseeId"
        FROM "franchisee_members"
        WHERE "active" = true
          AND "birthDate" IS NOT NULL
          AND EXTRACT(MONTH FROM "birthDate") = ${month}
      `);
  return rows.map((row) => row.franchiseeId);
}

function memberMatchesBirthday(member: TableMember, month: number, day: number | null) {
  if (!member.active || !member.birthDate) return false;
  return birthdayMatchesMonthDay(member.birthDate, month, day);
}

function BirthDateCell({ members, month, day }: { members: TableMember[]; month: number | null; day: number | null }) {
  if (!members.length) return <td className="px-4 py-3">—</td>;
  const primary = members[0];
  const matching = month
    ? members.filter((member) => memberMatchesBirthday(member, month, day))
    : [];
  const shown = Array.from(new Map([primary, ...matching].map((member) => [member.id, member])).values());
  const hiddenCount = Math.max(0, members.length - shown.length);
  return (
    <td className="px-4 py-3 align-top">
      <div className="space-y-1.5">
        {shown.map((member, index) => {
          const matches = month !== null && memberMatchesBirthday(member, month, day);
          return (
            <div key={member.id} className={`rounded-lg px-2 py-1.5 ${matches ? "bg-[#eef7ef] ring-1 ring-[#0b8f45]/20" : ""}`}>
              <p className="text-xs font-semibold text-slate-700">
                {index === 0 ? "Principal" : member.name}
                {!member.active ? " · inativa" : ""}
              </p>
              <p className={`text-sm ${matches ? "font-bold text-[#0b8f45]" : "text-slate-600"}`}>
                {formatCivilDate(member.birthDate) || "—"}
                {matches ? <span className="ml-1 text-[10px] uppercase tracking-wide">corresponde</span> : null}
              </p>
            </div>
          );
        })}
        {hiddenCount ? <p className="text-xs text-slate-500">+{hiddenCount} {hiddenCount === 1 ? "pessoa" : "pessoas"}</p> : null}
      </div>
    </td>
  );
}

async function getFranchiseesPage(query: string, requestedPage: number, birthdayMonth: number | null, birthdayDay: number | null) {
  try {
    const filters: Prisma.FranchiseeWhereInput[] = [];
    if (query) {
      filters.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { unitName: { contains: query, mode: "insensitive" } },
          { members: { some: { name: { contains: query, mode: "insensitive" } } } },
        ],
      });
    }
    if (birthdayMonth) {
      filters.push({
        id: { in: await getBirthdayUnitIds(birthdayMonth, birthdayDay) },
      });
    }
    const where: Prisma.FranchiseeWhereInput = filters.length ? { AND: filters } : {};
    const total = await prisma.franchisee.count({ where });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, requestedPage), pages);
    const franchisees = await prisma.franchisee.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        unitName: true,
        photoUrl: true,
        moment: true,
        active: true,
        createdAt: true,
        members: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, name: true, birthDate: true, active: true },
        },
        contacts: {
          orderBy: { contactedAt: "desc" },
          take: 1,
          select: { contactedAt: true },
        },
      },
    });

    return {
      page,
      pages,
      total,
      franchisees: franchisees.map((franchisee) => {
        const latest = franchisee.contacts[0];
        // IMPLANTACAO sem contato usa createdAt como referência (nunca null);
        // demais casos preservam a regra atual.
        const days = getDaysWithoutContact({
          lastContactedAt: latest?.contactedAt ?? null,
          unitCreatedAt: franchisee.createdAt,
          moment: franchisee.moment,
        });
        return {
          ...franchisee,
          latest,
          days,
          status:
            days === null
              ? "sem contato"
              : days <= 7
                ? "ativo"
                : days <= 14
                  ? "atenção"
                  : "crítico",
        };
      }),
    };
  } catch {
    const normalized = query.toLocaleLowerCase("pt-BR");
    const franchisees = fallbackFranchisees
      .filter(
        (item) =>
          !normalized ||
          `${item.name} ${item.unitName}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized),
      )
      .slice(0, PAGE_SIZE)
      .map((franchisee) => ({
        ...franchisee,
        members: [],
        latest: franchisee.contacts[0],
        days: 2,
        status: "ativo",
      }));
    return { franchisees, page: 1, pages: 1, total: franchisees.length };
  }
}

function pageHref(page: number, query: string, birthdayMonth: string, birthdayDay: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (birthdayMonth) params.set("birthdayMonth", birthdayMonth);
  if (birthdayDay) params.set("birthdayDay", birthdayDay);
  return `/franqueados?${params}`;
}

export default async function FranchiseesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const birthdayMonth = parseMonth(params.birthdayMonth);
  const birthdayDay = parseDay(params.birthdayDay);
  const requestedPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1,
  );
  const [{ franchisees, page, pages, total }, user] = await Promise.all([
    getFranchiseesPage(query, requestedPage, birthdayMonth, birthdayDay),
    getSessionUser(),
  ]);
  const isSuperAdmin = user?.role === "SUPERADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Cadastros
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Franqueados</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total}{" "}
            {total === 1 ? "franqueado encontrado" : "franqueados encontrados"}
          </p>
        </div>
        <Link
          href="/franqueados/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74]"
        >
          <Plus className="h-4 w-4" />
          Novo franqueado
        </Link>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_150px_auto]">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 focus-within:border-[#1f5d8c] focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nome ou unidade"
              className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#1f5d8c] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Buscar
            </button>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Mês de aniversário
            <select name="birthdayMonth" defaultValue={birthdayMonth ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700">
              <option value="">Todos os meses</option>
              {MONTH_LABELS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Dia e mês
            <select name="birthdayDay" defaultValue={birthdayDay ?? ""} disabled={!birthdayMonth} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">Todos os dias</option>
              {Array.from({ length: daysForMonth(birthdayMonth) }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{String(day).padStart(2, "0")}/{String(birthdayMonth ?? 1).padStart(2, "0")}</option>)}
            </select>
          </label>
          <Link href="/franqueados" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:border-[#1f5d8c] hover:text-[#1f5d8c]">
            Limpar
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Nascimento</th>
                <th className="px-4 py-3">Momento</th>
                <th className="px-4 py-3">Último contato</th>
                <th className="px-4 py-3">Dias sem contato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {franchisees.map((franchisee) => (
                <tr key={franchisee.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <img
                      src={
                        franchisee.photoUrl ||
                        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                      }
                      alt={franchisee.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {franchisee.name}
                  </td>
                  <td className="px-4 py-3">{franchisee.unitName}</td>
                  <BirthDateCell
                    members={franchisee.members ?? []}
                    month={birthdayMonth}
                    day={birthdayDay}
                  />
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {
                        FRANCHISE_MOMENT_LABELS[
                          franchisee.moment as keyof typeof FRANCHISE_MOMENT_LABELS
                        ]
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {franchisee.latest
                      ? formatDate(franchisee.latest.contactedAt)
                      : "Sem contato"}
                  </td>
                  <td className="px-4 py-3">{franchisee.days ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        franchisee.status === "ativo"
                          ? "bg-emerald-100 text-emerald-700"
                          : franchisee.status === "atenção"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {franchisee.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/franqueados/${franchisee.id}`}
                        className="font-medium text-[var(--brand-primary)] hover:underline"
                      >
                        Ver
                      </Link>
                      {user?.role !== "TV" ? (
                        <Link
                          href={`/franqueados/${franchisee.id}/editar`}
                          className="font-semibold text-[var(--brand-secondary)] hover:underline"
                        >
                          Editar
                        </Link>
                      ) : null}
                      {isSuperAdmin ? (
                        <DeleteFranchiseeAction
                          id={franchisee.id}
                          name={franchisee.name}
                          unitName={franchisee.unitName}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!franchisees.length ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Nenhum franqueado encontrado para esta busca.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {total ? (page - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(page * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Link
              aria-disabled={page === 1}
              href={pageHref(Math.max(1, page - 1), query, params.birthdayMonth ?? "", params.birthdayDay ?? "")}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${
                page === 1
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:border-[#1f5d8c]"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <span className="px-2">
              Página {page} de {pages}
            </span>
            <Link
              aria-disabled={page === pages}
              href={pageHref(Math.min(pages, page + 1), query, params.birthdayMonth ?? "", params.birthdayDay ?? "")}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${
                page === pages
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:border-[#1f5d8c]"
              }`}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
