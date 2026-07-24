"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { lookupCepAction } from "../actions/lookup-cep";
import { signUpAction } from "../actions/sign-up";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@/shared";

// Formulário de cadastro completo (design.md, componente 6; spec.md, story
// "Cadastro com perfil completo" AC1.1/AC1.2 e story "Endereço via CEP").
// Client Component: precisa de estado local, eventos de blur/change no CEP e
// chamada de server actions (`signUpAction`, `lookupCepAction`).

type FormState = {
  name: string;
  birthDate: string;
  cpf: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

const initialState: FormState = {
  name: "",
  birthDate: "",
  cpf: "",
  zipCode: "",
  street: "",
  addressNumber: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

export function SignUpForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // AC-CEP.1/AC-CEP.2/AC-CEP.3 (spec.md): consulta é conveniência, nunca
  // autoridade — sucesso preenche os campos (que continuam editáveis);
  // falha/não encontrado deixa os campos como estão, sem bloquear o submit.
  async function handleCepBlur() {
    if (!form.zipCode.trim()) {
      return;
    }

    setIsLookingUpCep(true);
    try {
      const result = await lookupCepAction(form.zipCode);
      if (result.status === "found") {
        setForm((prev) => ({
          ...prev,
          zipCode: result.address.zipCode,
          street: result.address.street,
          neighborhood: result.address.neighborhood,
          city: result.address.city,
          state: result.address.state,
        }));
      }
    } finally {
      setIsLookingUpCep(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await signUpAction(form);

      if (result.ok) {
        router.push("/app");
        return;
      }

      setFormError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Criar conta</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <Field label="Nome" htmlFor="name" errors={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoComplete="name"
              className="h-9"
            />
          </Field>

          <Field label="Data de nascimento" htmlFor="birthDate" errors={fieldErrors.birthDate}>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
              className="h-9"
            />
          </Field>

          <Field label="CPF" htmlFor="cpf" errors={fieldErrors.cpf}>
            <Input
              id="cpf"
              name="cpf"
              value={form.cpf}
              onChange={(e) => updateField("cpf", e.target.value)}
              placeholder="000.000.000-00"
              className="h-9"
            />
          </Field>

          <Field
            label="CEP"
            htmlFor="zipCode"
            errors={fieldErrors.zipCode}
            hint={isLookingUpCep ? "Consultando CEP..." : undefined}
          >
            <Input
              id="zipCode"
              name="zipCode"
              value={form.zipCode}
              onChange={(e) => updateField("zipCode", e.target.value)}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className="h-9"
            />
          </Field>

          <Field label="Logradouro" htmlFor="street" errors={fieldErrors.street}>
            <Input
              id="street"
              name="street"
              value={form.street}
              onChange={(e) => updateField("street", e.target.value)}
              autoComplete="address-line1"
              className="h-9"
            />
          </Field>

          <Field label="Número" htmlFor="addressNumber" errors={fieldErrors.addressNumber}>
            <Input
              id="addressNumber"
              name="addressNumber"
              value={form.addressNumber}
              onChange={(e) => updateField("addressNumber", e.target.value)}
              className="h-9"
            />
          </Field>

          <Field
            label="Complemento (opcional)"
            htmlFor="complement"
            errors={fieldErrors.complement}
          >
            <Input
              id="complement"
              name="complement"
              value={form.complement}
              onChange={(e) => updateField("complement", e.target.value)}
              autoComplete="address-line2"
              className="h-9"
            />
          </Field>

          <Field label="Bairro" htmlFor="neighborhood" errors={fieldErrors.neighborhood}>
            <Input
              id="neighborhood"
              name="neighborhood"
              value={form.neighborhood}
              onChange={(e) => updateField("neighborhood", e.target.value)}
              className="h-9"
            />
          </Field>

          <Field label="Cidade" htmlFor="city" errors={fieldErrors.city}>
            <Input
              id="city"
              name="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              autoComplete="address-level2"
              className="h-9"
            />
          </Field>

          <Field label="UF" htmlFor="state" errors={fieldErrors.state}>
            <Input
              id="state"
              name="state"
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              maxLength={2}
              autoComplete="address-level1"
              className="h-9"
            />
          </Field>

          <Field label="E-mail" htmlFor="email" errors={fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
              className="h-9"
            />
          </Field>

          <Field label="Senha" htmlFor="password" errors={fieldErrors.password}>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete="new-password"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres, com ao menos 1 letra minúscula, 1 maiúscula, 1 dígito
              numérico e 1 caractere especial.
            </p>
          </Field>

          <Field
            label="Confirmar senha"
            htmlFor="confirmPassword"
            errors={fieldErrors.confirmPassword}
          >
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              autoComplete="new-password"
              className="h-9"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="termsAccepted"
                checked={form.termsAccepted}
                onCheckedChange={(checked) => updateField("termsAccepted", checked === true)}
                className="mt-1"
              />
              <Label htmlFor="termsAccepted" className="text-sm font-medium cursor-pointer">
                Li e aceito os{" "}
                <a href="/terms" className="underline underline-offset-4 hover:text-foreground">
                  termos de uso
                </a>
              </Label>
            </div>
            {fieldErrors.termsAccepted?.map((message) => (
              <p key={message} className="text-xs text-destructive">
                {message}
              </p>
            ))}
          </div>

          {formError && (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="h-9 w-full">
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.map((message) => (
        <p key={message} className="text-xs font-medium text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}
