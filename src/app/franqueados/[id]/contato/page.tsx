"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type MemberOption = { id: string; name: string };

export default function NewContactPage() {
  const params = useParams();
  const router = useRouter();
  const franchiseeId = String(params.id);
  const [form, setForm] = useState({
    type: "TELEFONE",
    contactedAt: new Date().toISOString().slice(0, 16),
    notes: "",
    memberId: "",
  });
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/franchisees/${franchiseeId}/members`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) setMembers(data);
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, [franchiseeId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        // Pessoa opcional: vazio = contato da unidade (fluxo atual).
        memberId: form.memberId || undefined,
        franchiseeId,
        contactedAt: new Date(form.contactedAt).toISOString(),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Erro ao registrar contato." }));
      setError(payload.message || "Erro ao registrar contato.");
      return;
    }

    router.push(`/franqueados/${franchiseeId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Registrar contato</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Tipo de contato
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#1f5d8c]"
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="TELEFONE">Telefone</option>
            <option value="VIDEO_CHAMADA">Videochamada</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Data e hora
          <input
            type="datetime-local"
            value={form.contactedAt}
            onChange={(event) => setForm({ ...form, contactedAt: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#1f5d8c]"
          />
        </label>

        {members.length > 1 ? (
          <label className="block text-sm font-medium text-slate-700">
            Pessoa (opcional)
            <select
              value={form.memberId}
              onChange={(event) =>
                setForm({ ...form, memberId: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#1f5d8c]"
            >
              <option value="">Unidade (sem pessoa específica)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          Observação
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#1f5d8c]"
            placeholder="Descreva o contexto do contato"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" className="rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#174a74]">
          Salvar contato
        </button>
      </form>
    </div>
  );
}
