import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { fallbackFranchisees } from "@/lib/fallback-data";
import { FRANCHISE_MOMENT_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getSessionUser } from "@/services/auth";

async function getFranchiseesPage() {
  try {
    const franchisees = await prisma.franchisee.findMany({
      orderBy: { name: "asc" },
      include: {
        contacts: {
          orderBy: { contactedAt: "desc" },
          take: 1,
        },
      },
    });

    return franchisees.map((franchisee) => {
      const latest = franchisee.contacts[0];
      const days = latest ? Math.max(0, Math.ceil((Date.now() - new Date(latest.contactedAt).getTime()) / (1000 * 60 * 60 * 24))) : null;

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
    });
  } catch {
    return fallbackFranchisees.map((franchisee) => ({
      ...franchisee,
      latest: franchisee.contacts[0],
      days: 2,
      status: "ativo",
    }));
  }
}

export default async function FranchiseesPage() {
  const franchisees = await getFranchiseesPage();
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cadastros</p>
          <h1 className="text-3xl font-semibold text-slate-900">Franqueados</h1>
        </div>

        <Link
          href="/franqueados/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74]"
        >
          <Plus className="h-4 w-4" />
          Novo franqueado
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500">
          <Search className="h-4 w-4" />
          <input
            placeholder="Buscar franqueado"
            className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Unidade</th>
              <th className="px-4 py-3">Momento</th>
              <th className="px-4 py-3">Último contato</th>
              <th className="px-4 py-3">Dias sem contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {franchisees.map((franchisee) => (
              <tr key={franchisee.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <img
                    src={franchisee.photoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"}
                    alt={franchisee.name}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{franchisee.name}</td>
                <td className="px-4 py-3">{franchisee.unitName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {FRANCHISE_MOMENT_LABELS[franchisee.moment as keyof typeof FRANCHISE_MOMENT_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3">{franchisee.latest ? formatDate(franchisee.latest.contactedAt) : "Sem contato"}</td>
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
                  <div className="flex gap-3"><Link href={`/franqueados/${franchisee.id}`} className="text-[var(--brand-primary)] hover:underline">Ver</Link>{user?.role !== "TV" ? <Link href={`/franqueados/${franchisee.id}/editar`} className="font-semibold text-[var(--brand-secondary)] hover:underline">Editar</Link> : null}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
