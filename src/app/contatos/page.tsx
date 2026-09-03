import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Search,
} from "lucide-react";
import { ContactType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/services/auth";
import { AuditActions } from "@/components/contacts/audit-actions";

const PAGE_SIZE = 25;
const labels: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  VIDEO_CHAMADA: "Vídeo",
  PRESENCIAL: "Presencial",
};
const colors: Record<string, string> = {
  WHATSAPP: "bg-emerald-100 text-emerald-700",
  TELEFONE: "bg-blue-100 text-blue-700",
  VIDEO_CHAMADA: "bg-violet-100 text-violet-700",
  PRESENCIAL: "bg-amber-100 text-amber-700",
};
type Params = {
  q?: string;
  type?: keyof typeof labels;
  start?: string;
  end?: string;
  page?: string;
};
function dateAtStart(value?: string) {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function pageHref(page: number, params: Params) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  query.set("page", String(page));
  return `/contatos?${query}`;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const start = dateAtStart(params.start);
  const endStart = dateAtStart(params.end);
  const end = endStart ? new Date(endStart.setHours(23, 59, 59, 999)) : null;
  const requested = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where: Prisma.ContactWhereInput = {
    ...(query
      ? {
          franchisee: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { unitName: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(params.type && labels[params.type]
      ? { type: params.type as ContactType }
      : {}),
    ...(start || end
      ? {
          contactedAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        }
      : {}),
  };
  const total = await prisma.contact.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ contactedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      franchisee: { select: { id: true, name: true, unitName: true } },
      user: { select: { name: true } },
    },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">
            Auditoria da operação
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--brand-secondary)]">
            Contatos registrados
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Registros em ordem do mais recente para o mais antigo.
          </p>
        </div>
        <div className="rounded-2xl bg-[#eef7ef] px-4 py-3 text-right">
          <p className="text-2xl font-bold text-[#003b71]">{total}</p>
          <p className="text-xs text-slate-500">registros encontrados</p>
        </div>
      </div>
      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_155px_155px_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-[#0b8f45] focus-within:bg-white">
            <Search className="h-4 w-4 text-[var(--brand-primary)]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar franqueado ou unidade"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Filter className="h-4 w-4 text-[var(--brand-primary)]" />
            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="">Todos os canais</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              De
            </span>
            <input
              name="start"
              type="date"
              defaultValue={params.start}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Até
            </span>
            <input
              name="end"
              type="date"
              defaultValue={params.end}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <button className="rounded-xl bg-[#003b71] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#002d56]">
            Filtrar
          </button>
        </div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[.12em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Franqueado</th>
                <th className="px-4 py-4">Canal</th>
                <th className="px-4 py-4">Data e horário</th>
                <th className="px-5 py-4">Responsável</th>
                {user.role === "SUPERADMIN" && (
                  <th className="px-5 py-4 text-right">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-[#eef7ef]/45">
                  <td className="px-5 py-4">
                    <b className="text-[var(--brand-secondary)]">
                      {contact.franchisee.name}
                    </b>
                    <div className="mt-1 text-xs text-slate-500">
                      {contact.franchisee.unitName}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${colors[contact.type]}`}
                    >
                      {labels[contact.type]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <Clock3 className="h-4 w-4 text-[var(--brand-primary)]" />
                      {contact.contactedAt.toLocaleDateString("pt-BR")}{" "}
                      <span className="font-normal text-slate-500">
                        às{" "}
                        {contact.contactedAt.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {contact.user?.name ?? "Conta removida"}
                  </td>
                  {user.role === "SUPERADMIN" && (
                    <td className="px-5 py-4 text-right">
                      <AuditActions
                        id={contact.id}
                        subject={`${contact.franchisee.name} — ${labels[contact.type]}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {!contacts.length && (
                <tr>
                  <td
                    colSpan={user.role === "SUPERADMIN" ? 5 : 4}
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    Nenhum contato encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {total ? (page - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(page * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Link
              aria-disabled={page === 1}
              href={pageHref(Math.max(1, page - 1), params)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:border-[#0b8f45]"}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <span className="px-2">
              Página {page} de {pages}
            </span>
            <Link
              aria-disabled={page === pages}
              href={pageHref(Math.min(pages, page + 1), params)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:border-[#0b8f45]"}`}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
