"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@/shared";
import type { Transaction } from "../domain/types";
import { deleteTransactionAction } from "../actions/delete-transaction-action";

type DeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onDeleted: () => void;
};

/**
 * DeleteTransactionDialog shows a simple confirmation dialog for deleting a transaction.
 * No typed confirmation required — simpler than category deletion.
 */
export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction: initialTransaction,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initialTransaction) {
    return null;
  }

  const transaction = initialTransaction;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await deleteTransactionAction(transaction.id);

      if (result.ok) {
        handleOpenChange(false);
        router.refresh();
        onDeleted();
        return;
      }

      setError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir transação?</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
        </DialogDescription>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            className="max-sm:min-h-11"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="max-sm:min-h-11"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
