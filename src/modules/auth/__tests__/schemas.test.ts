import { describe, expect, it } from "vitest";

import {
  GENERIC_LOGIN_ERROR,
  GENERIC_SIGNUP_ERROR,
  loginInputSchema,
  passwordSchema,
  signUpInputSchema,
} from "../domain/schemas";

// Base válida reutilizada entre os testes de signUpInputSchema — cada teste
// sobrescreve apenas o campo sob teste.
const validSignUpInput = {
  name: "Maria Souza",
  birthDate: "1990-01-01",
  cpf: "111.444.777-35",
  zipCode: "01310-100",
  street: "Av. Paulista",
  addressNumber: "1000",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  email: "maria@example.com",
  password: "Senha123!",
  confirmPassword: "Senha123!",
  termsAccepted: true as const,
};

// AC1.3 (spec.md): "WHEN a senha submetida tem menos de 8 caracteres OU não
// contém ao menos 1 letra minúscula, 1 maiúscula, 1 dígito numérico e 1
// caractere especial THEN o sistema SHALL rejeitar a submissão."
describe("passwordSchema", () => {
  it("accepts a password meeting every rule (8+, lower, upper, digit, special)", () => {
    expect(passwordSchema.safeParse("Senha123!").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("Sh1!aB").success).toBe(false);
  });

  it("rejects a password without a lowercase letter", () => {
    expect(passwordSchema.safeParse("SENHA123!").success).toBe(false);
  });

  it("rejects a password without an uppercase letter", () => {
    expect(passwordSchema.safeParse("senha123!").success).toBe(false);
  });

  it("rejects a password without a digit", () => {
    expect(passwordSchema.safeParse("SenhaForte!").success).toBe(false);
  });

  it("rejects a password without a special character", () => {
    expect(passwordSchema.safeParse("Senha1234").success).toBe(false);
  });
});

describe("signUpInputSchema", () => {
  // AC1.2 (spec.md): formulário completo com todos os campos válidos é
  // aceito.
  it("accepts a fully valid sign-up input", () => {
    const result = signUpInputSchema.safeParse(validSignUpInput);

    expect(result.success).toBe(true);
  });

  // AC1.3 delegated to passwordSchema above; here we confirm the full
  // object rejects when password fails the policy.
  it("rejects when password fails the password policy", () => {
    const result = signUpInputSchema.safeParse({
      ...validSignUpInput,
      password: "weak",
      confirmPassword: "weak",
    });

    expect(result.success).toBe(false);
  });

  // AC1.4 (spec.md): "WHEN a confirmação de senha difere da senha THEN o
  // sistema SHALL rejeitar a submissão indicando a divergência."
  it("rejects when confirmPassword differs from password", () => {
    const result = signUpInputSchema.safeParse({
      ...validSignUpInput,
      confirmPassword: "Outra123!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find((issue) =>
        issue.path.includes("confirmPassword"),
      );
      expect(confirmError).toBeDefined();
    }
  });

  // AC1.5 (spec.md): idade menor que 18 anos rejeitada.
  it("rejects when birthDate corresponds to age under 18", () => {
    const result = signUpInputSchema.safeParse({
      ...validSignUpInput,
      birthDate: "2020-01-01",
    });

    expect(result.success).toBe(false);
  });

  // AC1.6 (spec.md): CPF com dígitos verificadores inválidos é rejeitado.
  it("rejects when cpf fails check-digit validation", () => {
    const result = signUpInputSchema.safeParse({
      ...validSignUpInput,
      cpf: "111.444.777-36",
    });

    expect(result.success).toBe(false);
  });

  // spec.md edge case: CPF com máscara é normalizado para 11 dígitos antes
  // de validar e persistir — confirmamos que o valor parseado sai
  // normalizado (sem máscara) quando válido.
  it("normalizes a masked cpf to 11 digits on success", () => {
    const result = signUpInputSchema.safeParse(validSignUpInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cpf).toBe("11144477735");
    }
  });

  // spec.md edge case: CEP com máscara é normalizado para 8 dígitos.
  it("normalizes a masked zip code to 8 digits on success", () => {
    const result = signUpInputSchema.safeParse(validSignUpInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zipCode).toBe("01310100");
    }
  });

  // AC1.8 (spec.md): "WHEN o checkbox de termos não está marcado THEN o
  // sistema SHALL impedir a submissão."
  it("rejects when termsAccepted is false", () => {
    const result = signUpInputSchema.safeParse({
      ...validSignUpInput,
      termsAccepted: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects when termsAccepted is missing", () => {
    const { termsAccepted, ...withoutTerms } = validSignUpInput;
    void termsAccepted;
    const result = signUpInputSchema.safeParse(withoutTerms);

    expect(result.success).toBe(false);
  });

  // complement is the only optional address field per design.md's
  // AddressFields type.
  it("accepts a missing complement (optional field)", () => {
    const { complement, ...withoutComplement } =
      validSignUpInput as typeof validSignUpInput & { complement?: string };
    void complement;
    const result = signUpInputSchema.safeParse(withoutComplement);

    expect(result.success).toBe(true);
  });
});

// AC-login.1 (spec.md, story "Login e sessão"): formulário com e-mail e
// senha.
describe("loginInputSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const result = loginInputSchema.safeParse({
      email: "maria@example.com",
      password: "any-password",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginInputSchema.safeParse({
      email: "not-an-email",
      password: "any-password",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginInputSchema.safeParse({
      email: "maria@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

// AC1.7 / AC-login.3 (spec.md): mensagens genéricas de erro, fonte da
// verdade para o texto exibido ao usuário (anti-enumeração).
describe("generic error messages", () => {
  it("exposes a non-empty generic signup error message", () => {
    expect(GENERIC_SIGNUP_ERROR.length).toBeGreaterThan(0);
  });

  it("exposes a non-empty generic login error message", () => {
    expect(GENERIC_LOGIN_ERROR.length).toBeGreaterThan(0);
  });
});
