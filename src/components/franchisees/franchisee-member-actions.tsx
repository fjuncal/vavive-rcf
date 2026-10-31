"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, MoveRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

export type TransferUnit = {
  id: string;
  unitName: string;
  active: boolean;
};

export function FranchiseeMemberActions({
  originFranchiseeId,
  originUnitName,
  memberId,
  memberName,
  units,
  onChanged,
}: {
  originFranchiseeId: string;
  originUnitName: string;
  memberId: string;
  memberName: string;
  units: TransferUnit[];
  onChanged?: (memberId: string) => void;
}) {
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [destinationId, setDestinationId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const destinationSelectRef = useRef<HTMLSelectElement>(null);
  const destinations = useMemo(
    () => units.filter((unit) => unit.id !== originFranchiseeId),
    [originFranchiseeId, units],
  );
  const destination = destinations.find((unit) => unit.id === destinationId);

  useEffect(() => {
    if (!transferOpen) return;
    const frame = window.requestAnimationFrame(() => destinationSelectRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setTransferOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [saving, transferOpen]);

  function openTransfer() {
    setDestinationId("");
    setConfirming(false);
    setError("");
    setTransferOpen(true);
  }

  async function transfer() {
    if (!destination || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/franchisees/${originFranchiseeId}/members/${memberId}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destinationFranchiseeId: destination.id }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Não foi possível transferir.");
      onChanged?.(memberId);
      setTransferOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível transferir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={openTransfer}
        disabled={!destinations.length}
        className="inline-flex items-center gap-1 rounded-lg border border-[#1f5d8c]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1f5d8c] transition hover:border-[#1f5d8c] hover:bg-[#1f5d8c]/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoveRight className="h-3.5 w-3.5" />
        Transferir
      </button>
      <DestructiveConfirmDialog
        title="Remover vínculo?"
        description="O responsável deixará de pertencer à unidade. Contatos, lives e histórico da unidade permanecem preservados; referências pessoais históricas ficam sem vínculo de membro."
        subject={`${memberName} · ${originUnitName}`}
        triggerLabel="Remover vínculo"
        confirmationWord="REMOVER"
        onConfirm={async () => {
          const response = await fetch(
            `/api/franchisees/${originFranchiseeId}/members/${memberId}`,
            { method: "DELETE" },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) return payload.message || "Não foi possível remover o vínculo.";
          onChanged?.(memberId);
          router.refresh();
        }}
      />

      {transferOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061d34]/60 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setTransferOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`transfer-member-title-${memberId}`}
            className="w-full max-w-[540px] overflow-hidden rounded-[30px] bg-white text-left shadow-2xl shadow-[#001d38]/35"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#1f5d8c] via-[#0b8f45] to-[#b8ee35]" />
            <div className="relative space-y-1 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
              <button
                type="button"
                onClick={() => setTransferOpen(false)}
                disabled={saving}
                aria-label="Fechar transferência"
                className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 sm:right-7 sm:top-6"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#0b8f45]">
                Gestão de responsável secundário
              </p>
              <h2 id={`transfer-member-title-${memberId}`} className="pr-10 text-2xl font-semibold text-[#062e54]">
                Transferir {memberName}
              </h2>
            </div>
            <div className="space-y-5 px-6 pb-7 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Origem</p>
                  <p className="mt-1 font-semibold text-[#062e54]">{originUnitName}</p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-[#0b8f45] sm:block" />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Destino</p>
                  <select
                    ref={destinationSelectRef}
                    value={destinationId}
                    onChange={(event) => {
                      setDestinationId(event.target.value);
                      setConfirming(false);
                      setError("");
                    }}
                    disabled={confirming || saving}
                    className="mt-1 w-full bg-transparent font-semibold text-[#062e54] outline-none"
                  >
                    <option value="">Selecione uma unidade</option>
                    {destinations.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unitName}{unit.active ? "" : " · Inativa"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {confirming && destination ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Confirme: <b>{memberName}</b> sairá de <b>{originUnitName}</b> e passará a pertencer a <b>{destination.unitName}</b>. O mesmo registro será movido, sem duplicidade.
                </p>
              ) : null}
              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  disabled={saving}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                {confirming ? (
                  <button
                    type="button"
                    onClick={() => void transfer()}
                    disabled={saving || !destination}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b8f45] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08753a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {saving ? "Transferindo..." : "Confirmar transferência"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={!destination}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Revisar transferência
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
