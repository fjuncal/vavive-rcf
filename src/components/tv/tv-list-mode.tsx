"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  Phone,
  Search,
  Users,
  Video,
  X,
} from "lucide-react";
type Channel = "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL";
type Franchisee = {
  id: string;
  name: string;
  unitName: string;
  photoUrl?: string | null;
  moment: string;
  whatsapp: number;
  telefone: number;
  video: number;
  presencial: number;
  live: number;
};
const channels: [Channel, string, typeof MessageCircle][] = [
  ["WHATSAPP", "WhatsApp", MessageCircle],
  ["TELEFONE", "Telefone", Phone],
  ["VIDEO_CHAMADA", "Vídeo", Video],
  ["PRESENCIAL", "Presencial", Users],
];
const key = (type: Channel) =>
  type === "VIDEO_CHAMADA"
    ? "video"
    : (type.toLowerCase() as "whatsapp" | "telefone" | "presencial");
export function TVListMode() {
  const [list, setList] = useState<Franchisee[]>([]);
  const [target, setTarget] = useState<Franchisee | null>(null);
  const [saving, setSaving] = useState("");
  const [done, setDone] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState<{
    id: string;
    item: Franchisee;
    type: Channel;
  } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch("/api/tv", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setList(d?.franchisees ?? []));
  }, []);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let paused = false;
    const id = window.setInterval(() => {
      if (paused || query.trim()) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 3)
        el.scrollTo({ top: 0, behavior: "auto" });
      else el.scrollBy({ top: 1, behavior: "smooth" });
    }, 80);
    const pause = () => (paused = true);
    const play = () => (paused = false);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", play);
    return () => {
      clearInterval(id);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", play);
    };
  }, [list.length, query]);
  async function save(item: Franchisee, type: Channel) {
    if (saving) return;
    setSaving(`${item.id}-${type}`);
    try {
      const r = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchiseeId: item.id,
          type,
          contactedAt: new Date().toISOString(),
        }),
      });
      if (!r.ok) return;
      const created = await r.json();
      setList((all) =>
        all.map((x) =>
          x.id === item.id ? { ...x, [key(type)]: x[key(type)] + 1 } : x,
        ),
      );
      setDone(item.id);
      setUndo({ id: created.id, item, type });
      window.setTimeout(
        () =>
          setUndo((current) => (current?.id === created.id ? null : current)),
        15_000,
      );
      setTarget(null);
      setTimeout(() => setDone(""), 1400);
    } finally {
      setSaving("");
    }
  }
  async function undoLast() {
    if (!undo) return;
    const response = await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: undo.id }),
    });
    if (!response.ok) return;
    setList((all) =>
      all.map((item) =>
        item.id === undo.item.id
          ? { ...item, [key(undo.type)]: Math.max(0, item[key(undo.type)] - 1) }
          : item,
      ),
    );
    setUndo(null);
  }
  const visible = list.filter((item) =>
    `${item.name} ${item.unitName}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <main className="min-h-screen bg-[#eef7ef] p-5 lg:p-8">
      <div className="mx-auto flex h-[calc(100vh-2.5rem)] max-w-[1800px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[#0b8f45]">
              Central VAVIVE · modo operação
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#003b71]">
              Rede em acompanhamento
            </h1>
          </div>
          <div className="flex gap-2">
            {role && role !== "TV" && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#003b71]"
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel
              </Link>
            )}
            <Link
              href="/tv/modo"
              className="inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-bold text-white"
            >
              <LayoutGrid className="h-4 w-4" />
              Modos da TV
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#003b71] to-[#07547b] px-6 py-4 text-white shadow-lg shadow-[#003b71]/15">
          <span className="text-sm font-medium text-white/75">
            A lista percorre a rede automaticamente. Toque em uma unidade para
            pausar e registrar.
          </span>
          <b className="rounded-full bg-[#b8ee35] px-3 py-1 text-sm text-[#003b71]">
            {list.length} unidades
          </b>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-[#0b8f45] focus-within:ring-4 focus-within:ring-[#0b8f45]/10">
          <Search className="h-5 w-5 text-[#0b8f45]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar franqueado ou unidade"
            className="w-full bg-transparent text-base text-[#003b71] outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600"
            >
              Limpar
            </button>
          )}
        </label>
        <section
          ref={box}
          className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-slate-200 bg-[#f8fbf8] p-4 shadow-xl"
        >
          <div className="space-y-3">
            {visible.map((item) => (
              <article
                key={item.id}
                onClick={() => setTarget(item)}
                className="group grid min-h-32 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0b8f45] hover:shadow-lg hover:shadow-[#0b8f45]/10"
              >
                <img
                  src={
                    item.photoUrl ||
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
                  }
                  alt=""
                  className="h-24 w-24 rounded-2xl border-4 border-[#eef7ef] object-cover shadow-md"
                />
                <button className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-xl text-[#003b71]">
                      {item.name}
                    </b>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.moment === "INAUGURADA" ? "bg-[#b8ee35]/40 text-[#003b71]" : "bg-emerald-100 text-[#0b8f45]"}`}
                    >
                      {item.moment === "INAUGURADA"
                        ? "INAUGURADA"
                        : "EM IMPLANTAÇÃO"}
                    </span>
                  </div>
                  <span className="mt-1 block truncate text-sm text-slate-500">
                    {item.unitName}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {[
                      ["WhatsApp", item.whatsapp],
                      ["Telefone", item.telefone],
                      ["Vídeo", item.video],
                      ["Presencial", item.presencial],
                      ["Lives", item.live],
                    ].map(([name, value]) => (
                      <span
                        key={String(name)}
                        className="rounded-lg border border-slate-100 bg-[#f8fbf8] px-2.5 py-1.5 font-bold text-slate-500"
                      >
                        {name} <b className="text-[#003b71]">{value}</b>
                      </span>
                    ))}
                  </div>
                  <small className="mt-3 block font-bold text-[#0b8f45]">
                    Toque para abrir o cartão completo
                  </small>
                </button>
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="grid grid-cols-2 rounded-2xl border border-slate-100 bg-[#f8fbf8] p-2"
                >
                  <p className="col-span-2 mb-1 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                    Registrar agora
                  </p>
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    {channels.map(([type, label, Icon]) => (
                      <button
                        key={type}
                        onClick={() => save(item, type)}
                        disabled={Boolean(saving)}
                        className="group/button flex min-h-16 items-center gap-2 rounded-xl border border-[#0b8f45]/15 bg-white px-4 text-sm font-bold text-[#003b71] shadow-sm transition hover:scale-[1.02] hover:border-[#0b8f45] hover:bg-[#0b8f45] hover:text-white disabled:opacity-50"
                      >
                        <Icon className="h-4 w-4 text-[#0b8f45] transition group-hover/button:text-white" />
                        {saving === `${item.id}-${type}` ? "..." : label}
                      </button>
                    ))}
                  </div>
                </div>
                {done === item.id && <Check className="text-[#0b8f45]" />}
              </article>
            ))}
            {!visible.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                Nenhum franqueado encontrado.
              </div>
            )}
          </div>
        </section>
      </div>
      {undo && (
        <div className="fixed bottom-6 left-1/2 z-40 flex w-[min(92vw,560px)] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl bg-[#003b71] px-5 py-4 text-white shadow-2xl">
          <span>
            <b className="block text-base">Contato registrado</b>
            <small className="text-white/70">
              Toque em desfazer se foi engano. Disponível por 15 segundos.
            </small>
          </span>
          <button
            onClick={undoLast}
            className="rounded-xl bg-[#b8ee35] px-4 py-3 text-sm font-bold text-[#003b71]"
          >
            Desfazer
          </button>
        </div>
      )}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/55 p-5 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-[30px] border border-white/30 bg-white p-7 shadow-2xl">
            <button
              onClick={() => setTarget(null)}
              className="float-right rounded-xl p-2 hover:bg-slate-100"
            >
              <X />
            </button>
            <div className="flex items-center gap-5">
              <img
                src={
                  target.photoUrl ||
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
                }
                alt=""
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0b8f45]">
                  Registrar contato
                </p>
                <h2 className="mt-1 text-3xl font-semibold text-[#003b71]">
                  {target.name}
                </h2>
                <p className="text-slate-500">{target.unitName}</p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {channels.map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => save(target, type)}
                  disabled={Boolean(saving)}
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-100 bg-[#f8fbf8] text-[#003b71] transition hover:-translate-y-0.5 hover:border-[#0b8f45] hover:bg-[#eef7ef] disabled:opacity-50"
                >
                  <Icon className="h-7 w-7 text-[#0b8f45]" />
                  <b>
                    {saving === `${target.id}-${type}` ? "Salvando..." : label}
                  </b>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
