import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { fallbackFranchisees } from "@/lib/fallback-data";
import { FRANCHISE_MOMENT_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getSessionUser } from "@/services/auth";

const PAGE_SIZE = 20;
type PageParams = { q?: string; page?: string };

async function getFranchiseesPage(query: string, requestedPage: number) {
  try {
    const where = query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { unitName: { contains: query, mode: "insensitive" as const } }] } : {};
    const total = await prisma.franchisee.count({ where });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, requestedPage), pages);
    const franchisees = await prisma.franchisee.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { contacts: { orderBy: { contactedAt: "desc" }, take: 1 } } });
    return { page, pages, total, franchisees: franchisees.map((franchisee) => {
      const latest = franchisee.contacts[0];
      const days = latest ? Math.max(0, Math.ceil((Date.now() - latest.contactedAt.getTime()) / 86_400_000)) : null;
      return { ...franchisee, latest, days, status: days === null ? "sem contato" : days <= 7 ? "ativo" : days <= 14 ? "atenção" : "crítico" };
    }) };
  } catch {
    const normalized = query.toLocaleLowerCase("pt-BR");
    const franchisees = fallbackFranchisees.filter((item) => !normalized || `${item.name} ${item.unitName}`.toLocaleLowerCase("pt-BR").includes(normalized)).slice(0, PAGE_SIZE).map((franchisee) => ({ ...franchisee, latest: franchisee.contacts[0], days: 2, status: "ativo" }));
    return { franchisees, page: 1, pages: 1, total: franchisees.length };
  }
}

function pageHref(page: number, query: string) { const params = new URLSearchParams({ page: String(page) }); if (query) params.set("q", query); return `/franqueados?${params}`; }

export default async function FranchiseesPage({ searchParams }: { searchParams: Promise<PageParams> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [{ franchisees, page, pages, total }, user] = await Promise.all([getFranchiseesPage(query, requestedPage), getSessionUser()]);
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cadastros</p><h1 className="text-3xl font-semibold text-slate-900">Franqueados</h1><p className="mt-1 text-sm text-slate-500">{total} {total === 1 ? "franqueado encontrado" : "franqueados encontrados"}</p></div><Link href="/franqueados/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74]"><Plus className="h-4 w-4" />Novo franqueado</Link></div>
    <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 focus-within:border-[#1f5d8c] focus-within:bg-white"><Search className="h-4 w-4" /><input name="q" defaultValue={query} placeholder="Buscar por nome ou unidade" className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" /><button type="submit" className="rounded-lg bg-[#1f5d8c] px-3 py-1.5 text-xs font-semibold text-white">Buscar</button></label></form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[900px] w-full divide-y divide-slate-200"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Foto</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Unidade</th><th className="px-4 py-3">Momento</th><th className="px-4 py-3">Último contato</th><th className="px-4 py-3">Dias sem contato</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead><tbody className="divide-y divide-slate-200 text-sm text-slate-700">{franchisees.map((franchisee) => <tr key={franchisee.id} className="hover:bg-slate-50/80"><td className="px-4 py-3"><img src={franchisee.photoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"} alt={franchisee.name} className="h-11 w-11 rounded-full object-cover" /></td><td className="px-4 py-3 font-medium text-slate-900">{franchisee.name}</td><td className="px-4 py-3">{franchisee.unitName}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{FRANCHISE_MOMENT_LABELS[franchisee.moment as keyof typeof FRANCHISE_MOMENT_LABELS]}</span></td><td className="px-4 py-3">{franchisee.latest ? formatDate(franchisee.latest.contactedAt) : "Sem contato"}</td><td className="px-4 py-3">{franchisee.days ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${franchisee.status === "ativo" ? "bg-emerald-100 text-emerald-700" : franchisee.status === "atenção" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-100"}`}>{franchisee.status}</span></td><td className="px-4 py-3"><div className="flex gap-3"><Link href={`/franqueados/${franchisee.id}`} className="text-[var(--brand-primary)] hover:underline">Ver</Link>{user?.role !== "TV" && <Link href={`/franqueados/${franchisee.id}/editar`} className="font-semibold text-[var(--brand-secondary)] hover:underline">Editar</Link>}</div></td></tr>)}{!franchisees.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Nenhum franqueado encontrado para esta busca.</td></tr>}</tbody></table></div><div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} de {total}</span><div className="flex items-center gap-2"><Link aria-disabled={page === 1} href={pageHref(Math.max(1, page - 1), query)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:border-[#1f5d8c]"}`}><ChevronLeft className="h-4 w-4" />Anterior</Link><span className="px-2">Página {page} de {pages}</span><Link aria-disabled={page === pages} href={pageHref(Math.min(pages, page + 1), query)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:border-[#1f5d8c]"}`}>Próxima<ChevronRight className="h-4 w-4" /></Link></div></div></div>
  </div>;
}
