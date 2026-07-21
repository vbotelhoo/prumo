"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
} from "@/shared";
import type { Commitment } from "../domain/types";
import type { Category } from "@/modules/categories";
import { createCommitmentAction } from "../actions/create-commitment-action";
import { updateCommitmentAction } from "../actions/update-commitment-action";

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCommitment?: Commitment;
  categories: Category[];
  onSuccess?: () => void;
}

export function CommitmentModal({
  isOpen,
  onClose,
  editingCommitment,
  categories,
  onSuccess,
}: CommitmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"installment_payment" | "fixed_payment">("installment_payment");

  const categoryItems = categories.map((cat) => ({ value: cat.id, label: cat.name }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const input = {
      mode: formData.get("mode"),
      total: mode === "installment_payment" ? formData.get("total") : undefined,
      installmentValue: mode === "fixed_payment" ? formData.get("installmentValue") : undefined,
      installmentCount: parseInt(formData.get("installmentCount") as string),
      firstDueDate: formData.get("firstDueDate"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
    };

    startTransition(async () => {
      const result = editingCommitment
        ? await updateCommitmentAction(editingCommitment.id, input)
        : await createCommitmentAction(input);

      if (result.ok) {
        onClose();
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCommitment ? "Editar Compromisso" : "Novo Compromisso"}
          </DialogTitle>
          <DialogDescription>
            Registre uma compra parcelada ou financiamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Compromisso</Label>
            <RadioGroup
              defaultValue={mode}
              onValueChange={(value) => setMode(value as "installment_payment" | "fixed_payment")}
              name="mode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="installment_payment" id="installment" />
                <Label htmlFor="installment" className="cursor-pointer">
                  Compra Parcelada
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed_payment" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer">
                  Financiamento/Dívida
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              placeholder="ex: Notebook Dell"
              maxLength={140}
              defaultValue={editingCommitment?.description}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              name="categoryId"
              defaultValue={editingCommitment?.categoryId}
              items={categoryItems}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "installment_payment" ? (
            <div className="space-y-2">
              <Label htmlFor="total">Valor Total (R$)</Label>
              <Input
                id="total"
                name="total"
                type="text"
                placeholder="1.250,00"
                defaultValue={editingCommitment ? editingCommitment.total / 100 : ""}
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="installmentValue">Valor da Parcela (R$)</Label>
              <Input
                id="installmentValue"
                name="installmentValue"
                type="text"
                placeholder="100,00"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="installmentCount">Número de Parcelas</Label>
            <Input
              id="installmentCount"
              name="installmentCount"
              type="number"
              min={2}
              max={360}
              defaultValue={editingCommitment?.installmentCount}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstDueDate">Data da Primeira Parcela</Label>
            <Input
              id="firstDueDate"
              name="firstDueDate"
              type="date"
              defaultValue={editingCommitment?.firstDueDate}
              required
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvando..." : editingCommitment ? "Atualizar" : "Criar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
