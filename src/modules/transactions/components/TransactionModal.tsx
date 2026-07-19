"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared";
import type { Category } from "@/modules/categories";
import type { Transaction } from "../domain/types";
import { createTransactionAction } from "../actions/create-transaction-action";
import { updateTransactionAction } from "../actions/update-transaction-action";

type TransactionModalProps = {
  categories: Category[];
  transaction?: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type FormState = {
  type: "entrada" | "saida";
  date: string;
  amountRaw: string;
  description: string;
  categoryId: string;
};

type FieldErrors = Record<string, string[] | undefined>;

const TYPE_ITEMS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
];

/**
 * TransactionModal is a unified modal for creating and editing transactions.
 * In create mode (no transaction prop), it shows a blank form.
 * In edit mode (transaction prop provided), it pre-populates fields.
 * When type changes, the category select is re-filtered.
 */
export function TransactionModal({
  categories,
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: TransactionModalProps) {
  const isEditMode = !!transaction;
  const title = isEditMode ? "Editar transação" : "Nova transação";

  // Initialize form state
  const getInitialState = (): FormState => {
    if (transaction) {
      return {
        type: transaction.type,
        date: transaction.date,
        amountRaw: (transaction.amount / 100).toFixed(2).replace(".", ","),
        description: transaction.description || "",
        categoryId: transaction.categoryId,
      };
    }
    return {
      type: "entrada",
      date: new Date().toISOString().split("T")[0],
      amountRaw: "",
      description: "",
      categoryId: "",
    };
  };

  const [form, setForm] = useState<FormState>(getInitialState());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setForm(getInitialState());
      setFieldErrors({});
      setGeneralError(null);
    }
    onOpenChange(newOpen);
  };

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // If type changed, reset categoryId since categories are type-filtered
      if (field === "type" && prev.type !== value) {
        next.categoryId = "";
      }
      return next;
    });
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = isEditMode
        ? await updateTransactionAction(transaction!.id, form)
        : await createTransactionAction(form);

      if (result.ok) {
        handleOpenChange(false);
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      } else {
        setGeneralError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter categories by selected type
  const availableCategories = categories.filter((cat) => cat.type === form.type);
  const categoryItems = availableCategories.map((cat) => ({ value: cat.id, label: cat.name }));

  const minDate = "2000-01-01";
  const maxDate = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const futureDate = new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split("T")[0];
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {generalError && (
            <p className="text-sm text-destructive">{generalError}</p>
          )}

          {/* Type select */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="txn-type">Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(value) => updateField("type", value as "entrada" | "saida")}
              items={TYPE_ITEMS}
            >
              <SelectTrigger id="txn-type" disabled={isSubmitting}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.type && (
              <p className="text-sm text-destructive">{fieldErrors.type[0]}</p>
            )}
          </div>

          {/* Date input */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="txn-date">Data</Label>
            <Input
              id="txn-date"
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              min={minDate}
              max={maxDate}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.date}
            />
            {fieldErrors.date && (
              <p className="text-sm text-destructive">{fieldErrors.date[0]}</p>
            )}
          </div>

          {/* Amount input */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="txn-amount">Valor</Label>
            <Input
              id="txn-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.amountRaw}
              onChange={(e) => updateField("amountRaw", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.amountRaw}
            />
            {fieldErrors.amountRaw && (
              <p className="text-sm text-destructive">{fieldErrors.amountRaw[0]}</p>
            )}
          </div>

          {/* Category select */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="txn-category">Categoria</Label>
            <Select
              value={form.categoryId || ""}
              onValueChange={(value) => updateField("categoryId", value || "")}
              items={categoryItems}
            >
              <SelectTrigger id="txn-category" disabled={isSubmitting || availableCategories.length === 0}>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.categoryId && (
              <p className="text-sm text-destructive">{fieldErrors.categoryId[0]}</p>
            )}
          </div>

          {/* Description input */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="txn-description">Descrição (opcional)</Label>
            <Input
              id="txn-description"
              type="text"
              placeholder="Ex: Compras no mercado"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.description}
            />
            {fieldErrors.description && (
              <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Salvando..."
                  : "Criando..."
                : isEditMode
                  ? "Salvar"
                  : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
