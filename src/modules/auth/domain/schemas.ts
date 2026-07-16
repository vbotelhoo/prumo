import { z } from "zod";

import { isAdult, isValidCpf, normalizeCpf, normalizeZipCode } from "./validators";

// Schemas Zod do cadastro/login (design.md, componente 2; AD-003: Zod é a
// fonte de verdade dos contratos entre camadas). Zero dependências de
// Next/React/Prisma neste diretório (regra 3 de fronteira do PROJECT.md).

// AC1.7 / AC-login.3 (spec.md): mesma mensagem genérica independentemente do
// campo que causou a falha (anti-enumeração).
export const GENERIC_SIGNUP_ERROR = "Não foi possível concluir o cadastro.";
export const GENERIC_LOGIN_ERROR = "E-mail ou senha inválidos.";

// AC1.3 (spec.md): >= 8 caracteres, 1 minúscula, 1 maiúscula, 1 dígito e 1
// caractere especial.
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .regex(/[a-z]/, "A senha deve conter ao menos 1 letra minúscula.")
  .regex(/[A-Z]/, "A senha deve conter ao menos 1 letra maiúscula.")
  .regex(/[0-9]/, "A senha deve conter ao menos 1 dígito numérico.")
  .regex(
    /[^A-Za-z0-9]/,
    "A senha deve conter ao menos 1 caractere especial.",
  );

const cpfField = z
  .string()
  .transform((value) => normalizeCpf(value))
  .pipe(z.string().length(11, "CPF inválido."))
  .refine((value) => isValidCpf(value), "CPF inválido.");

const zipCodeField = z
  .string()
  .transform((value) => normalizeZipCode(value))
  .pipe(z.string().length(8, "CEP inválido."));

const trimmedString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message);

// AC1.1 / AC1.2 (spec.md, story "Cadastro"): campos do formulário completo.
export const signUpInputSchema = z
  .object({
    name: trimmedString("Nome é obrigatório."),
    birthDate: z.string().refine((value) => isAdult(value), {
      message: "É necessário ter 18 anos ou mais.",
    }),
    cpf: cpfField,
    zipCode: zipCodeField,
    street: trimmedString("Logradouro é obrigatório."),
    addressNumber: trimmedString("Número é obrigatório."),
    complement: z
      .string()
      .trim()
      .optional(),
    neighborhood: trimmedString("Bairro é obrigatório."),
    city: trimmedString("Cidade é obrigatória."),
    state: trimmedString("UF é obrigatória."),
    email: z.email("E-mail inválido.").trim(),
    password: passwordSchema,
    confirmPassword: z.string(),
    // AC1.8 (spec.md): checkbox de termos não marcado impede a submissão —
    // `z.literal(true)` só aceita o valor exato `true`.
    termsAccepted: z.literal(true, "É necessário aceitar os termos de uso."),
  })
  // AC1.4 (spec.md): confirmação de senha divergente é rejeitada.
  .refine((data) => data.password === data.confirmPassword, {
    message: "A confirmação de senha não confere.",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpInputSchema>;

// AC-login.1 (spec.md, story "Login e sessão"): e-mail e senha.
export const loginInputSchema = z.object({
  email: z.email("E-mail inválido.").trim(),
  password: z.string().min(1, "Senha é obrigatória."),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
