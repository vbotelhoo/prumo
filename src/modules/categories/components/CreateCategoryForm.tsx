"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared";
import type { CategoryType } from "../domain/types";
import { createCategoryAction } from "../actions/create-category-action";

type FormState = {
  name: string;
  type: CategoryType;
};

const initialState: FormState = { name: "", type: "entrada" };

type FieldErrors = Record<string, string[] | undefined>;

/**
 * CreateCategoryForm is an inline form for creating custom categories.
 * Validates input via Zod schema in the action, displays field-level errors,
 * and refreshes the page on success.
 */
export function CreateCategoryForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await createCategoryAction(form);

      if (result.ok) {
        // Success: reset form and refresh
        setForm(initialState);
        router.refresh();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Criar nova categoria personalizada</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {generalError && (
            <p className="text-sm text-destructive">{generalError}</p>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Ex: Restaurante"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="cat-type">Tipo</Label>
            <Select value={form.type} onValueChange={(value) => updateField("type", value as CategoryType)}>
              <SelectTrigger id="cat-type" disabled={isSubmitting}>
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

          <Button type="submit" className="max-sm:min-h-11" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar categoria"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
