"use client";
import Link from "next/link";
import {
  Grid2X2,
  LayoutDashboard,
  LayoutGrid,
  MonitorPlay,
  Rows3,
  SplitSquareHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
export default function TVModePage() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);
  return (
    <main className="min-h-[100dvh] bg-[#eef7ef] p-4 text-[#003b71] lg:p-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col justify-center">
        {role && role !== "TV" && (
          <div className="mb-6 flex justify-end">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-bold text-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              Ir para o painel
            </Link>
          </div>
        )}
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#0b8f45]">
            Central VAVIVE
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Escolha o modo da TV</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Selecione a experiência adequada para o acompanhamento e o registro
            touch da equipe.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/tv"
            className="group rounded-[32px] bg-gradient-to-br from-[#003b71] to-[#0b8f45] p-8 text-white shadow-xl transition hover:-translate-y-1"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b8ee35] text-[#003b71]">
              <MonitorPlay className="h-7 w-7" />
            </span>
            <p className="mt-10 text-xs font-bold uppercase tracking-[.22em] text-[#b8ee35]">
              Modo apresentação
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Carrossel interativo
            </h2>
            <p className="mt-3 max-w-md text-white/70">
              Um franqueado por vez, indicadores da rede e ações grandes para a
              tela touch.
            </p>
            <span className="mt-8 inline-flex rounded-xl bg-white/10 px-4 py-3 text-sm font-bold group-hover:bg-white/20">
              Abrir carrossel
            </span>
          </Link>
          <Link
            href="/tv/carrossel/2"
            className="group rounded-[32px] border border-[#003b71]/15 bg-white p-8 shadow-xl transition hover:-translate-y-1 hover:border-[#0b8f45]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef7ef] text-[#0b8f45]">
              <SplitSquareHorizontal className="h-7 w-7" />
            </span>
            <p className="mt-10 text-xs font-bold uppercase tracking-[.22em] text-[#0b8f45]">
              Modo apresentação
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Carrossel duplo</h2>
            <p className="mt-3 max-w-md text-slate-500">
              Dois franqueados em destaque por vez, com rotação automática e
              ações touch em cada card.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-bold text-white group-hover:bg-[#0b8f45]">
              Abrir 2 franqueados
            </span>
          </Link>
          <Link
            href="/tv/carrossel/4"
            className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl transition hover:-translate-y-1 hover:border-[#0b8f45]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b8ee35]/40 text-[#003b71]">
              <Grid2X2 className="h-7 w-7" />
            </span>
            <p className="mt-10 text-xs font-bold uppercase tracking-[.22em] text-[#0b8f45]">
              Modo apresentação
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Carrossel em grade</h2>
            <p className="mt-3 max-w-md text-slate-500">
              Quatro franqueados por tela para uma visão mais ampla da rede, sem
              perder os botões de comunicação.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-bold text-white group-hover:bg-[#0b8f45]">
              Abrir 4 franqueados
            </span>
          </Link>
          <Link
            href="/tv/lista"
            className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl transition hover:-translate-y-1 hover:border-[#0b8f45]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef7ef] text-[#0b8f45]">
              <Rows3 className="h-7 w-7" />
            </span>
            <p className="mt-10 text-xs font-bold uppercase tracking-[.22em] text-[#0b8f45]">
              Modo operação
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Lista de franqueados
            </h2>
            <p className="mt-3 max-w-md text-slate-500">
              Visualize a rede em lista contínua, toque no cadastro ou registre
              a comunicação diretamente na linha.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-bold text-white group-hover:bg-[#0b8f45]">
              <LayoutGrid className="h-4 w-4" />
              Abrir lista
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
