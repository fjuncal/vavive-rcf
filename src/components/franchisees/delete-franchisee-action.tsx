"use client";

import { useRouter } from "next/navigation";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

export function DeleteFranchiseeAction({
  id,
  name,
  unitName,
}: {
  id: string;
  name: string;
  unitName: string;
}) {
  const router = useRouter();

  return (
    <DestructiveConfirmDialog
      title="Remover franqueado?"
      description="O cadastro e todo o histórico de contatos deste franqueado serão removidos permanentemente. Esta ação não pode ser desfeita."
      subject={`${name} — ${unitName}`}
      triggerLabel="Remover"
      onConfirm={async () => {
        const response = await fetch("/api/franchisees", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return payload.message || "Não foi possível remover o franqueado.";
        }
        router.refresh();
      }}
    />
  );
}
