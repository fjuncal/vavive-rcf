"use client";

import { useRouter } from "next/navigation";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

export function AuditActions({ id, subject }: { id: string; subject: string }) {
  const router = useRouter();

  return (
    <DestructiveConfirmDialog
      title="Excluir registro de contato?"
      description="Este registro deixará de aparecer na auditoria e nos indicadores. Esta ação não pode ser desfeita."
      subject={subject}
      triggerLabel="Excluir"
      onConfirm={async () => {
        const response = await fetch("/api/contacts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return payload.message || "Não foi possível excluir o registro.";
        }
        router.refresh();
      }}
    />
  );
}
