"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral da rede" }, "/franqueados": { title: "Franqueados", subtitle: "Cadastro e acompanhamento" }, "/contatos": { title: "Histórico de contatos", subtitle: "Registros da operação" }, "/administracao/usuarios": { title: "Usuários e permissões", subtitle: "Administração do sistema" },
};

export function Topbar({ userName }: { userName: string }) {
  const path = usePathname(); const current = labels[path] ?? (path.startsWith("/franqueados") ? labels["/franqueados"] : labels["/dashboard"]);
  async function logout() { try { await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }); } finally { window.location.assign("/login"); } }
  return <header className="flex min-h-20 items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--brand-primary)]">Central VAVIVE</p><h2 className="mt-1 text-2xl font-semibold text-[var(--brand-secondary)]">{current.title}</h2><p className="mt-1 text-sm text-slate-500">{current.subtitle}</p></div><div className="flex items-center gap-3"><div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003b71] text-white"><UserRound className="h-4 w-4" /></span><span><b className="block max-w-40 truncate text-sm text-[#003b71]">{userName}</b><small className="text-xs text-slate-500">Conta conectada</small></span><ChevronDown className="h-4 w-4 text-slate-400" /></div><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></button></div></header>;
}
