"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  Pencil,
  UserPlus,
  Users,
  X,
} from "lucide-react";

export type UnitMemberItem = {
  id: string;
  name: string;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c] focus:bg-white";

const FALLBACK_MEMBER_PHOTO =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80";

function MemberPhoto({
  photoUrl,
  name,
  className,
}: {
  photoUrl: string | null;
  name: string;
  className: string;
}) {
  return (
    <img
      src={photoUrl || FALLBACK_MEMBER_PHOTO}
      alt={name}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = FALLBACK_MEMBER_PHOTO;
      }}
      className={className}
    />
  );
}

function EditMemberDialog({
  franchiseeId,
  member,
  onSaved,
}: {
  franchiseeId: string;
  member: UnitMemberItem;
  onSaved: (member: UnitMemberItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member.name);
  const [photoUrl, setPhotoUrl] = useState(member.photoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !uploading) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, saving, uploading]);

  function reset() {
    setName(member.name);
    setPhotoUrl(member.photoUrl ?? "");
    setError("");
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível enviar a foto.");
      }
      if (typeof payload.url !== "string") {
        throw new Error("O upload não retornou uma foto válida.");
      }
      setPhotoUrl(payload.url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/franchisees/${franchiseeId}/members/${member.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, photoUrl }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível salvar.");
      }
      setOpen(false);
      onSaved(payload as UnitMemberItem);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        title={`Editar ${member.name}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#1f5d8c] hover:text-[#1f5d8c] focus:outline-none focus:ring-4 focus:ring-[#1f5d8c]/10"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/50 p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving && !uploading)
              setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-member-title-${member.id}`}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white text-left shadow-2xl"
          >
            <div className="flex items-start justify-between bg-gradient-to-br from-[#003b71] to-[#145987] px-7 py-6 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b8ee35]">
                  Pessoa da unidade
                </p>
                <h2
                  id={`edit-member-title-${member.id}`}
                  className="mt-1 text-2xl font-semibold"
                >
                  Editar franqueado
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving || uploading}
                className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-7">
              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-[var(--brand-primary)]">
                <MemberPhoto
                  photoUrl={photoUrl || null}
                  name={name || member.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                />
                <span className="min-w-0">
                  <b className="block text-[var(--brand-secondary)]">
                    {photoUrl ? "Alterar foto" : "Adicionar foto"}
                  </b>
                  <small className="mt-1 block text-slate-500">
                    JPG, PNG ou WebP — até 5 MB
                  </small>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={saving || uploading}
                  onChange={(event) => uploadPhoto(event.target.files?.[0])}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Nome
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  className={`${inputClass} mt-2 bg-white`}
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving || uploading}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5d8c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174a74] disabled:opacity-60"
                >
                  {saving || uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  {uploading
                    ? "Enviando foto..."
                    : saving
                      ? "Salvando..."
                      : "Salvar alterações"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function FranchiseeMembersPanel({
  franchiseeId,
  initialMembers,
  canManage,
}: {
  franchiseeId: string;
  initialMembers: UnitMemberItem[];
  canManage: boolean;
}) {
  const router = useRouter();
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
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <MemberPhoto
              photoUrl={member.photoUrl}
              name={member.name}
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
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
            {canManage ? (
              <EditMemberDialog
                franchiseeId={franchiseeId}
                member={member}
                onSaved={(updatedMember) => {
                  setMembers((current) =>
                    current.map((item) =>
                      item.id === updatedMember.id ? updatedMember : item,
                    ),
                  );
                  setFeedback({
                    type: "success",
                    text: `${updatedMember.name} foi atualizado.`,
                  });
                  router.refresh();
                }}
              />
            ) : null}
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
