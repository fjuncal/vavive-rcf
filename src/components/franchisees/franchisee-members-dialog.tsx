"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Users, X } from "lucide-react";
import { formatCivilDate } from "@/lib/utils";
import {
  FranchiseeMemberActions,
  type TransferUnit,
} from "@/components/franchisees/franchisee-member-actions";

export type ManagedFranchiseeMember = {
  id: string;
  name: string;
  birthDate: string | null;
  active: boolean;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function FranchiseeMembersDialog({
  franchiseeId,
  unitName,
  initialMembers,
  units,
  canManage,
}: {
  franchiseeId: string;
  unitName: string;
  initialMembers: ManagedFranchiseeMember[];
  units: TransferUnit[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const members = initialMembers.filter(
    (member) => !hiddenMemberIds.has(member.id),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setHiddenMemberIds(new Set());
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      const activeDialog =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest('[role="dialog"]')
          : null;
      if (activeDialog && activeDialog !== dialogRef.current) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [close, open]);

  const count = members.length;
  const countLabel = `${count} ${count === 1 ? "responsável" : "responsáveis"}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1f5d8c] transition hover:border-[#1f5d8c] hover:bg-[#1f5d8c]/5 focus:outline-none focus:ring-4 focus:ring-[#1f5d8c]/10"
      >
        <Users className="h-3.5 w-3.5" />
        Responsáveis
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          {count}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061d34]/60 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`members-dialog-title-${franchiseeId}`}
            className="flex max-h-[min(82vh,700px)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] bg-white text-left shadow-2xl shadow-[#001d38]/35"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-[#f8fbf8] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0b8f45]">
                  Responsáveis da unidade
                </p>
                <h2
                  id={`members-dialog-title-${franchiseeId}`}
                  className="mt-1 truncate text-xl font-semibold text-[#062e54]"
                >
                  {unitName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{countLabel}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Fechar responsáveis"
                className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#1f5d8c]/10"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div
                    key={member.id}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {member.name}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${index === 0 ? "bg-[#1f5d8c]/10 text-[#1f5d8c]" : "bg-slate-100 text-slate-600"}`}
                        >
                          {index === 0 ? "Principal" : "Secundário"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {member.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5 text-[#0b8f45]" />
                        {formatCivilDate(member.birthDate) || "Nascimento não informado"}
                      </p>
                    </div>
                    {canManage && index > 0 ? (
                      <FranchiseeMemberActions
                        originFranchiseeId={franchiseeId}
                        originUnitName={unitName}
                        memberId={member.id}
                        memberName={member.name}
                        units={units}
                        onChanged={(memberId) =>
                          setHiddenMemberIds((current) =>
                            new Set(current).add(memberId),
                          )
                        }
                      />
                    ) : (
                      <span className="text-right text-xs font-semibold text-slate-400">
                        Principal protegido
                      </span>
                    )}
                  </div>
                ))}
                {!members.length ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    Nenhum responsável vinculado a esta unidade.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
