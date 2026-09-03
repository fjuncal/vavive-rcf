"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Pencil,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  LiveFormModal,
  type LiveFormValue,
  type LiveFranchisee,
  type LiveHost,
} from "@/components/lives/live-form-modal";

type Detail = LiveFormValue & {
  hostName: string;
  hostRole: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    id: string;
    name: string;
    unitName: string;
    photoUrl: string | null;
    moment: "IMPLANTACAO" | "INAUGURADA";
  }>;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const roleLabel = (role: string) =>
  role === "SUPPORT"
    ? "Suporte"
    : role === "ADMIN"
      ? "Administrador"
      : "Superadmin";

export function LiveDetails({
  live,
  hosts,
  franchisees,
  canDelete,
}: {
  live: Detail;
  hosts: LiveHost[];
  franchisees: LiveFranchisee[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const date = new Date(live.scheduledAt);
  const scheduled = date > new Date();
  const participants = useMemo(
    () =>
      live.participants.filter((item) =>
        `${item.name} ${item.unitName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [live.participants, query],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="border-b border-[var(--border)] pb-6">
        <Link
          href="/lives"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--brand-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lives
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-secondary)]">
                {live.title}
              </h1>
              <StatusBadge scheduled={scheduled} />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--brand-primary)]" />
                {date.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--brand-primary)]" />
                {date.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--brand-primary)]" />
                {live.participants.length} participantes
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[var(--brand-primary)]" />
                {live.hostName}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-secondary)] px-4 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-secondary)]/20"
            >
              <Pencil className="h-4 w-4" />
              Editar Live
            </button>
            {canDelete ? (
              <DestructiveConfirmDialog
                title="Excluir esta Live?"
                description="Os contatos LIVE gerados para os participantes desta Live também serão removidos. Outros contatos dos franqueados não serão alterados."
                subject={live.title}
                triggerLabel="Excluir"
                onConfirm={async () => {
                  const response = await fetch(`/api/lives/${live.id}`, {
                    method: "DELETE",
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok)
                    return data.message || "Não foi possível excluir a Live.";
                  router.push("/lives");
                  router.refresh();
                }}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--brand-secondary)]">
                  Participantes
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {live.participants.length} franqueados vinculados a esta live.
                </p>
              </div>
              <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10 sm:max-w-xs">
                <Search className="h-4 w-4 text-[var(--brand-primary)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nome ou unidade"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
            </div>

            {participants.length ? (
              <div className="divide-y divide-[var(--border)]">
                {participants.map((item) => (
                  <Link
                    href={`/franqueados/${item.id}`}
                    key={item.id}
                    className="group flex flex-col gap-3 px-5 py-4 transition hover:bg-[var(--background)]/70 sm:flex-row sm:items-center lg:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {item.photoUrl ? (
                        <Image
                          src={item.photoUrl}
                          alt=""
                          width={44}
                          height={44}
                          unoptimized
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-sm font-bold text-[var(--brand-primary)]">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--brand-secondary)]">
                          {item.name}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                          {item.unitName}
                        </p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {item.moment === "INAUGURADA"
                        ? "Inaugurada"
                        : "Em implantação"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--brand-primary)]">
                      Ver franqueado
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <Search className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  Nenhum participante encontrado
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Tente buscar por outro nome ou unidade.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--brand-primary)]">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-[var(--brand-secondary)]">
                Observações
              </h2>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
              {live.notes || "Nenhuma observação registrada para esta Live."}
            </p>
          </section>
        </main>

        <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:sticky lg:top-6">
          <div className="border-b border-[var(--border)] p-5">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-primary)]">
              Responsável pela Live
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--background)] text-sm font-bold text-[var(--brand-primary)]">
                {live.hostName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--brand-secondary)]">
                  {live.hostName}
                </p>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {roleLabel(live.hostRole)}
                </p>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-[var(--border)] px-5">
            <AuditItem label="Criada por" value={live.createdByName} />
            <AuditItem
              label="Data da Live"
              value={date.toLocaleDateString("pt-BR")}
            />
            <AuditItem
              label="Criada em"
              value={formatDateTime(live.createdAt)}
            />
            <AuditItem
              label="Atualizada em"
              value={formatDateTime(live.updatedAt)}
            />
          </dl>
        </aside>
      </div>

      {editing ? (
        <LiveFormModal
          initial={{
            id: live.id,
            title: live.title,
            scheduledAt: live.scheduledAt,
            hostUserId: live.hostUserId,
            participantIds: live.participantIds,
            notes: live.notes,
          }}
          hosts={hosts}
          franchisees={franchisees}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ scheduled }: { scheduled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        scheduled
          ? "bg-blue-50 text-blue-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {scheduled ? (
        <Clock3 className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {scheduled ? "Agendada" : "Realizada"}
    </span>
  );
}

function AuditItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4">
      <dt className="text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
