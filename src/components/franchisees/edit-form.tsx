"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { getTodayCivilDate, toDateInputValue } from "@/lib/utils";

type Form = {
  id: string;
  name: string;
  unitName: string;
  photoUrl: string | null;
  moment: "IMPLANTACAO" | "INAUGURADA";
  active: boolean;
  joinedNetworkAt: Date | string | null;
  inauguratedAt: Date | string | null;
  primaryMemberBirthDate: Date | string | null;
};

async function upload(file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/uploads", { method: "POST", body });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message);
  return payload.url as string;
}

export function EditFranchiseeForm({ franchisee, isSuperAdmin }: { franchisee: Form; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...franchisee,
    joinedNetworkAt: toDateInputValue(franchisee.joinedNetworkAt),
    inauguratedAt: toDateInputValue(franchisee.inauguratedAt),
    primaryMemberBirthDate: toDateInputValue(franchisee.primaryMemberBirthDate),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fileChange(file?: File) {
    if (!file) return;
    try {
      setSaving(true);
      const photoUrl = await upload(file);
      setForm((current) => ({ ...current, photoUrl }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro no upload");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.joinedNetworkAt && form.inauguratedAt && form.inauguratedAt < form.joinedNetworkAt) {
      setError("A inauguração não pode ser anterior à entrada na rede.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        id: form.id,
        name: form.name,
        unitName: form.unitName,
        photoUrl: form.photoUrl,
        moment: form.moment,
        active: form.active,
        primaryMemberBirthDate: form.primaryMemberBirthDate,
      };
      if (isSuperAdmin) {
        payload.joinedNetworkAt = form.joinedNetworkAt || null;
        payload.inauguratedAt = form.inauguratedAt || null;
      }
      const response = await fetch("/api/franchisees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responsePayload.message);
      router.push(`/franqueados/${form.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">Cadastro</p>
      <h1 className="mt-1 text-3xl font-semibold text-[var(--brand-secondary)]">Editar franqueado</h1>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 hover:border-[var(--brand-primary)]">
          {form.photoUrl ? <img src={form.photoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <ImagePlus className="h-8 w-8 text-[var(--brand-primary)]" />}
          <span><b className="block">Alterar foto</b><small className="text-slate-500">JPG, PNG ou WebP até 5 MB</small></span>
          <input type="file" accept="image/*" className="hidden" onChange={(event) => fileChange(event.target.files?.[0])} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Nome da pessoa principal<input className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label className="block text-sm font-semibold text-slate-700">Unidade<input className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.unitName} onChange={(event) => setForm({ ...form, unitName: event.target.value })} required /></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Data de nascimento
          <input type="date" className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.primaryMemberBirthDate} max={getTodayCivilDate()} onChange={(event) => setForm({ ...form, primaryMemberBirthDate: event.target.value })} />
        </label>
        <select className="w-full rounded-xl border p-3" value={form.moment} onChange={(event) => setForm({ ...form, moment: event.target.value as Form["moment"] })}><option value="IMPLANTACAO">Implantação</option><option value="INAUGURADA">Inaugurada</option></select>
        <label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Unidade ativa</label>
        {isSuperAdmin ? <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Data de entrada na rede<input type="date" className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.joinedNetworkAt} onChange={(event) => setForm({ ...form, joinedNetworkAt: event.target.value })} /></label><label className="block text-sm font-semibold text-slate-700">Data de inauguração<input type="date" className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.inauguratedAt} onChange={(event) => setForm({ ...form, inauguratedAt: event.target.value })} /></label></div> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button disabled={saving} className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar alterações"}</button>
      </form>
    </div>
  );
}
