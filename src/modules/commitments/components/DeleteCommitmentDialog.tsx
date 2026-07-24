"use client";

import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from "@/shared";
import type { Commitment } from "../domain/types";
import { deleteCommitmentAction } from "../actions/delete-commitment-action";

interface DeleteCommitmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commitment?: Commitment;
  onSuccess?: () => void;
}

export function DeleteCommitmentDialog({
  isOpen,
  onClose,
  commitment,
  onSuccess,
}: DeleteCommitmentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!commitment) return;

    startTransition(async () => {
      const result = await deleteCommitmentAction(commitment.id);
      if (result.ok) {
        onClose();
        onSuccess?.();
      }
    });
  };

  if (!commitment) return null;

  const hasPaid = commitment.installments?.some((i) => i.status === "paga") ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Compromisso</DialogTitle>
          <DialogDescription>
            {hasPaid
              ? "As parcelas já pagas serão preservadas como histórico. Apenas as parcelas previstas serão removidas."
              : "Esta ação não pode ser desfeita."}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-3 rounded text-sm">
          <p className="font-semibold text-foreground">{commitment.description}</p>
          <p className="text-muted-foreground">Compromisso será removido</p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
