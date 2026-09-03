"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VaviveLogo } from "@/components/brand/vavive-logo";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  MonitorPlay,
  Settings2,
  Users,
} from "lucide-react";
const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/franqueados", label: "Franqueados", icon: Users },
  { href: "/contatos", label: "Contatos", icon: BarChart3 },
  { href: "/tv/modo", label: "Modo TV", icon: MonitorPlay },
];
export function AppSidebar({
  isSuperAdmin = false,
}: {
  isSuperAdmin?: boolean;
}) {
  const path = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#003b71] text-white sm:w-72">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white"><VaviveLogo className="h-12 w-12" /></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#b8ee35]">
            Central de suporte
          </p>
          <h1 className="mt-1 font-semibold tracking-[.18em]">VAVIVE</h1>
        </div>
      </div>
      <nav className="space-y-1 px-4 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/45">
          Navegação
        </p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#b8ee35] text-[#003b71] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {isSuperAdmin ? (
          <>
            <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/45">
              Administração
            </p>
            <Link
              href="/administracao/usuarios"
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${path.startsWith("/administracao") ? "bg-[#b8ee35] text-[#003b71]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <Settings2 className="h-4 w-4" />
              Usuários e roles
            </Link>
          </>
        ) : null}
      </nav>
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-3 text-xs text-white/65">
          <Building2 className="h-4 w-4 text-[#b8ee35]" />
          Rede VAVIVE
        </div>
      </div>
    </aside>
  );
}
