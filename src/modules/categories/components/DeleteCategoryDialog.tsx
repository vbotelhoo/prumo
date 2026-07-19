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
  Input,
} from "@/shared";
import type { Category } from "../domain/types";
import { deleteCategoryAction } from "../actions/delete-category-action";
import { CATEGORY_IN_USE_ERROR } from "../domain/constants";

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  isInUse: boolean;
  onDeleted: () => void;
};

const CONFIRMATION_TEXT = "excluir permanentemente";

/**
 * DeleteCategoryDialog handles the deletion of custom categories with two variants:
 * 1. "Em uso" variant: category has transactions, deletion is blocked
 * 2. "Livre" variant: requires typing exact confirmation text, shows irreversibility warning
 */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category: initialCategory,
  isInUse,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const router = useRouter();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initialCategory) {
    return null;
  }

  const category = initialCategory;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setConfirmationInput("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const isConfirmationValid = confirmationInput === CONFIRMATION_TEXT;

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await deleteCategoryAction(category.id);

      if (result.ok) {
        // Success
        setConfirmationInput("");
        handleOpenChange(false);
        router.refresh();
        onDeleted();
        return;
      }

      // Check if category became in-use during deletion
      if (result.error === CATEGORY_IN_USE_ERROR) {
        setError(result.error);
        // UI should show "em uso" variant after this error
        return;
      }

      setError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInUse) {
    // "Em uso" variant: category has transactions
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categoria em uso</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            A categoria &ldquo;{category.name}&rdquo; possui transações associadas e não pode ser
            excluída. Remova ou reclassifique as transações antes de tentar novamente.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // "Livre" variant: no transactions, requires confirmation text
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir categoria &ldquo;{category.name}&rdquo;?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-destructive font-medium">
            ⚠️ Esta ação não pode ser desfeita
          </div>
          <DialogDescription>
            Digite &ldquo;{CONFIRMATION_TEXT}&rdquo; abaixo para confirmar a exclusão permanente
            desta categoria.
          </DialogDescription>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Input
            placeholder={CONFIRMATION_TEXT}
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isSubmitting}
          >
            {isSubmitting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
