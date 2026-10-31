"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, X } from "lucide-react";
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

type MemberOption = {
  id: string;
  name: string;
  photoUrl: string | null;
  birthDate: string | null;
  active: boolean;
};

async function upload(file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/uploads", { method: "POST", body });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message);
  return payload.url as string;
}

export function EditFranchiseeForm({
  franchisee,
  members,
  isSuperAdmin,
}: {
  franchisee: Form;
  members: MemberOption[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...franchisee,
    joinedNetworkAt: toDateInputValue(franchisee.joinedNetworkAt),
    inauguratedAt: toDateInputValue(franchisee.inauguratedAt),
    primaryMemberBirthDate: toDateInputValue(franchisee.primaryMemberBirthDate),
  });
  const currentPrimary = members[0] ?? null;
  const [selectedPrimaryId, setSelectedPrimaryId] = useState(
    currentPrimary?.id ?? "",
  );
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string | null>(null);
  const confirmPrimaryRef = useRef<HTMLButtonElement>(null);
  const pendingPrimary = members.find((member) => member.id === pendingPrimaryId);
  const selectedPrimary = members.find((member) => member.id === selectedPrimaryId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pendingPrimaryId) return;
    const frame = window.requestAnimationFrame(() => confirmPrimaryRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingPrimaryId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pendingPrimaryId]);

  function requestPrimaryChange(nextId: string) {
    if (!currentPrimary || nextId === currentPrimary.id) {
      setSelectedPrimaryId(currentPrimary?.id ?? "");
      setPendingPrimaryId(null);
      return;
    }
    setPendingPrimaryId(nextId);
  }

  function confirmPrimaryChange() {
    if (!pendingPrimary) return;
    setSelectedPrimaryId(pendingPrimary.id);
    setForm((current) => ({
      ...current,
      name: pendingPrimary.name,
      photoUrl: pendingPrimary.photoUrl ?? "",
      primaryMemberBirthDate: pendingPrimary.birthDate ?? "",
    }));
    setPendingPrimaryId(null);
  }

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
        primaryMemberId: selectedPrimaryId || undefined,
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
        {members.length ? (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Responsável principal</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Atual: <span className="font-semibold text-slate-700">{currentPrimary?.name}</span>
                  {currentPrimary?.active ? " · ativo" : " · inativo"}
                </p>
              </div>
              <span className="rounded-full bg-[#1f5d8c]/10 px-2.5 py-1 text-xs font-bold text-[#1f5d8c]">
                {members.length} {members.length === 1 ? "responsável" : "responsáveis"}
              </span>
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Selecionar novo principal
              <select
                value={selectedPrimaryId}
                onChange={(event) => requestPrimaryChange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 outline-none focus:border-[#1f5d8c] focus:ring-4 focus:ring-[#1f5d8c]/10"
              >
                {members
                  .filter((member) => member.active || member.id === currentPrimary?.id)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}{member.id === currentPrimary?.id ? " · atual" : " · secundário"}
                    </option>
                  ))}
              </select>
            </label>
            {selectedPrimaryId !== currentPrimary?.id && selectedPrimary ? (
              <p className="mt-3 rounded-xl border border-[#b8ee35]/70 bg-[#f4fbe2] px-3 py-2.5 text-xs leading-5 text-[#164b2b]">
                Novo principal: <b>{selectedPrimary.name}</b>. {currentPrimary?.name} continuará associado como secundário.
              </p>
            ) : null}
          </section>
        ) : null}
        <select className="w-full rounded-xl border p-3" value={form.moment} onChange={(event) => setForm({ ...form, moment: event.target.value as Form["moment"] })}><option value="IMPLANTACAO">Implantação</option><option value="INAUGURADA">Inaugurada</option></select>
        <label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Unidade ativa</label>
        {isSuperAdmin ? <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Data de entrada na rede<input type="date" className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.joinedNetworkAt} onChange={(event) => setForm({ ...form, joinedNetworkAt: event.target.value })} /></label><label className="block text-sm font-semibold text-slate-700">Data de inauguração<input type="date" className="mt-2 w-full rounded-xl border p-3 font-normal" value={form.inauguratedAt} onChange={(event) => setForm({ ...form, inauguratedAt: event.target.value })} /></label></div> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button disabled={saving} className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar alterações"}</button>
      </form>
      {pendingPrimary && currentPrimary ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061d34]/60 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingPrimaryId(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="primary-change-title"
            aria-describedby="primary-change-description"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-left shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[#f8fbf8] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0b8f45]">Confirmação</p>
                <h2 id="primary-change-title" className="mt-1 text-xl font-semibold text-[#062e54]">Trocar responsável principal?</h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingPrimaryId(null)}
                aria-label="Cancelar troca de principal"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#1f5d8c]/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <p className="truncate rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{currentPrimary.name}</p>
                <ArrowRight className="h-4 w-4 text-[#0b8f45]" />
                <p className="truncate rounded-xl bg-[#f4fbe2] px-3 py-2 text-sm font-semibold text-[#164b2b]">{pendingPrimary.name}</p>
              </div>
              <p id="primary-change-description" className="text-sm leading-6 text-slate-600">
                <b>{pendingPrimary.name}</b> será o novo principal. <b>{currentPrimary.name}</b> continuará vinculado a esta unidade como responsável secundário.
              </p>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingPrimaryId(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  ref={confirmPrimaryRef}
                  type="button"
                  onClick={confirmPrimaryChange}
                  className="rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74] focus:outline-none focus:ring-4 focus:ring-[#1f5d8c]/20"
                >
                  Confirmar troca
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
