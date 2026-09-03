"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

type DestructiveConfirmDialogProps = {
  title: string;
  description: string;
  subject: string;
  triggerLabel: string;
  confirmationWord?: string;
  onConfirm: () => Promise<string | void>;
  className?: string;
};

export function DestructiveConfirmDialog({
  title,
  description,
  subject,
  triggerLabel,
  confirmationWord = "EXCLUIR",
  onConfirm,
  className = "",
}: DestructiveConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const canConfirm =
    typedConfirmation.trim().toUpperCase() === confirmationWord;

  function close() {
    if (removing) return;
    setOpen(false);
    setTypedConfirmation("");
    setError("");
  }

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, removing]);

  async function confirm() {
    if (!canConfirm || removing) return;
    setRemoving(true);
    setError("");

    try {
      const result = await onConfirm();
      if (result) {
        setError(result);
        return;
      }
      setOpen(false);
      setTypedConfirmation("");
    } catch {
      setError("Não foi possível concluir a exclusão. Tente novamente.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 ${className}`}
      >
        <Trash2 className="h-4 w-4" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061d34]/60 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="destructive-dialog-title"
            className="w-full max-w-[540px] overflow-hidden rounded-[30px] bg-white text-left shadow-2xl shadow-[#001d38]/35"
          >
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-600 to-orange-400" />
            <div className="relative px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
              <button
                type="button"
                onClick={close}
                disabled={removing}
                aria-label="Fechar confirmação"
                className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 sm:right-7 sm:top-6"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/60">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.22em] text-red-600">
                    Confirmação de segurança
                  </p>
                  <h2
                    id="destructive-dialog-title"
                    className="mt-1.5 text-2xl font-semibold tracking-tight text-[#062e54]"
                  >
                    {title}
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 pb-7 sm:px-8">
              <p className="max-w-[440px] text-sm leading-6 text-slate-600">
                {description}
              </p>

              <div className="rounded-2xl border border-red-100 bg-red-50/55 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-red-500">
                  Você está prestes a remover
                </p>
                <p className="mt-1.5 break-words text-base font-semibold text-[#062e54]">
                  {subject}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <label className="block text-sm font-semibold leading-5 text-slate-700">
                  Digite o código abaixo para liberar a exclusão
                  <span className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-[.14em] text-red-600">
                    {confirmationWord}
                    <ArrowRight className="h-3.5 w-3.5 text-red-400" />
                  </span>
                  <input
                    autoFocus
                    value={typedConfirmation}
                    onChange={(event) =>
                      setTypedConfirmation(event.target.value)
                    }
                    placeholder={`Digite ${confirmationWord}`}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold uppercase text-slate-800 outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-xs leading-5 text-slate-400">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={close}
                  disabled={removing}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Manter registro
                </button>
                <button
                  type="button"
                  disabled={!canConfirm || removing}
                  onClick={confirm}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {removing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {removing ? "Excluindo..." : "Excluir agora"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
