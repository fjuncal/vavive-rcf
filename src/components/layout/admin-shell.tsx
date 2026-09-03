import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getSessionUser } from "@/services/auth";
export async function AdminShell({ children }: { children: React.ReactNode }) { const user = await getSessionUser(); if (!user || user.role === "TV") redirect(user?.role === "TV" ? "/tv" : "/login"); return <div className="min-h-screen bg-slate-100 text-slate-900"><div className="flex min-h-screen"><AppSidebar isSuperAdmin={user.role === "SUPERADMIN"}/><div className="flex min-h-screen min-w-0 flex-1 flex-col"><Topbar userName={user.name}/><main className="flex-1 p-6 lg:p-8">{children}</main></div></div></div>; }
