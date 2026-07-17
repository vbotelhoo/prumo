"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { signInAction } from "../actions/sign-in";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/shared";

// Formulário de login (design.md, componente 6; spec.md, story "Login e
// sessão" AC-login.1/AC-login.2/AC-login.3). Client Component: estado local
// dos campos e navegação client-side pós-sucesso.

type FormState = {
  email: string;
  password: string;
};

const initialState: FormState = { email: "", password: "" };

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await signInAction(form);

      if (result.ok) {
        router.push("/app");
        return;
      }

      // AC-login.3 (spec.md): mesma mensagem genérica, sem distinguir
      // e-mail inexistente de senha errada.
      setFormError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
