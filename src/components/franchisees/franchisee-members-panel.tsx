"use client";

import { useState } from "react";
import { UserPlus, Users } from "lucide-react";

export type UnitMemberItem = {
  id: string;
  name: string;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c] focus:bg-white";

export function FranchiseeMembersPanel({
  franchiseeId,
  initialMembers,
  canManage,
}: {
  franchiseeId: string;
  initialMembers: UnitMemberItem[];
  canManage: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/franchisees/${franchiseeId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, photoUrl }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.message || "Não foi possível adicionar a pessoa.",
        );
      }
      setMembers((current) => [...current, payload]);
      setName("");
      setPhotoUrl("");
      setFeedback({
        type: "success",
        text: `${payload.name} agora faz parte desta unidade.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível adicionar a pessoa.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Users className="h-5 w-5 text-[var(--brand-primary)]" />
        Franqueados
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Pessoas vinculadas a esta unidade. A unidade continua única.
      </p>

      <div className="mt-4 space-y-3">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <img
              src={
                member.photoUrl ||
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
              }
              alt={member.name}
              className="h-12 w-12 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {member.name}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-2 text-xs">
                {index === 0 ? (
                  <span className="rounded-full bg-[#1f5d8c]/10 px-2 py-0.5 font-bold text-[#1f5d8c]">
                    Principal
                  </span>
                ) : null}
                {!member.active ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-500">
                    Inativa
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        ))}
        {!members.length ? (
          <p className="text-sm text-slate-500">
            Nenhuma pessoa vinculada a esta unidade.
          </p>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}
        >
          {feedback.text}
        </p>
      ) : null}

      {canManage ? (
        <form
          onSubmit={submit}
          className="mt-4 space-y-4 border-t border-slate-100 pt-5"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserPlus className="h-4 w-4" />
            Adicionar pessoa à unidade
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Maria Silva"
                required
                minLength={2}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              URL da foto (opcional)
              <input
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder="https://..."
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {saving ? "Adicionando..." : "Adicionar pessoa"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
