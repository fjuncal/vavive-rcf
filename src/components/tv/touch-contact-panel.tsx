"use client";

import { useMemo, useState } from "react";
import { Check, MessageCircle, Phone, Search, Users, Video, X } from "lucide-react";

export type TVFranchisee = { id: string; name: string; unitName: string; photoUrl?: string | null };
const channels = [
  { type: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { type: "TELEFONE", label: "Telefone", icon: Phone },
  { type: "VIDEO_CHAMADA", label: "Vídeo", icon: Video },
  { type: "PRESENCIAL", label: "Presencial", icon: Users },
] as const;

async function saveContact(franchiseeId: string, type: string) {
  return fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ franchiseeId, type, contactedAt: new Date().toISOString() }) });
}

export function QuickContactButtons({ franchisee }: { franchisee: TVFranchisee }) {
  const [saved, setSaved] = useState("");
  async function save(type: string) { const response = await saveContact(franchisee.id, type); if (response.ok) { setSaved(type); setTimeout(() => setSaved(""), 1800); } }
  return <div className="mt-7"><p className="mb-3 text-sm font-medium text-white/70">Registrar comunicação</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{channels.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => save(type)} className={`flex min-h-16 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${saved === type ? "border-[#b8ee35] bg-[#b8ee35] text-[#003b71]" : "border-white/20 bg-white/10 text-white hover:border-[#b8ee35]"}`}><Icon className="h-4 w-4" />{saved === type ? "Salvo" : label}</button>)}</div></div>;
}

export function TouchContactPanel({ franchisees, selectedId, onSelect }: { franchisees: TVFranchisee[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [contactTarget, setContactTarget] = useState<TVFranchisee | null>(null); const [saved, setSaved] = useState(false);
  const visible = useMemo(() => franchisees.filter(item => `${item.name} ${item.unitName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [franchisees, query]);
  async function save(type: string) { if (!contactTarget) return; const response = await saveContact(contactTarget.id, type); if (response.ok) { setSaved(true); setTimeout(() => { setSaved(false); setContactTarget(null); }, 1400); } }
  return <><div className="mt-5 border-t border-slate-100 pt-5"><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0b8f45]">Navegação touch</p><h3 className="text-xl font-semibold text-[#003b71]">Franqueados</h3></div><label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome ou unidade" className="w-full bg-transparent text-sm outline-none" /></label><div className="h-[min(42vh,440px)] space-y-2 overflow-y-auto pr-1">{visible.map(item => <div key={item.id} className={`flex items-center gap-2 rounded-xl border p-2 transition ${selectedId === item.id ? "border-[#0b8f45] bg-[#eef7ef]" : "border-slate-100"}`}><button onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><img src={item.photoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"} alt="" className="h-11 w-11 rounded-lg object-cover" /><span className="min-w-0"><b className="block truncate text-sm text-[#003b71]">{item.name}</b><small className="block truncate text-slate-500">{item.unitName}</small></span></button><button onClick={() => setContactTarget(item)} className="rounded-lg bg-[#0b8f45] px-3 py-2 text-xs font-semibold text-white">Contato</button></div>)}{visible.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">Nenhum franqueado encontrado.</p> : null}</div></div>{contactTarget ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/45 p-6 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#0b8f45]">Registrar contato</p><h2 className="mt-1 text-3xl font-semibold text-[#003b71]">{contactTarget.name}</h2><p className="text-slate-500">{contactTarget.unitName}</p></div><button onClick={() => setContactTarget(null)} className="rounded-full p-2 hover:bg-slate-100"><X /></button></div>{saved ? <div className="my-10 flex flex-col items-center gap-3 text-[#0b8f45]"><Check className="h-16 w-16 rounded-full bg-[#b8ee35] p-3" /><b>Contato registrado!</b></div> : <div className="mt-7 grid grid-cols-2 gap-3">{channels.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => save(type)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 text-[#003b71] hover:border-[#0b8f45]"><Icon className="h-7 w-7 text-[#0b8f45]" /><b>{label}</b></button>)}</div>}</div></div> : null}</>;
}
