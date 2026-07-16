import { afterEach, describe, expect, it } from "vitest";

import { signUpCore } from "../actions/sign-up-core";
import { auth } from "../domain/auth";
import { GENERIC_SIGNUP_ERROR } from "../domain/schemas";
import { prisma } from "@/shared";

// Integração (design.md, componente 9; spec.md, story "Cadastro com perfil
// completo"; tasks.md T7): exercita `signUpCore` contra um Postgres real
// (Testcontainers via `vitest.global-setup.ts`, mesmo padrão de
// `db.integration.test.ts`). `headers` é um `Headers` manual — fora de uma
// request real do Next.js, `next/headers` não resolve (por isso a lógica
// mora em `signUpCore`, não em `signUpAction`; ver nota em
// `actions/sign-up-core.ts`).

const emailsToCleanup = new Set<string>();

afterEach(async () => {
  if (emailsToCleanup.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: Array.from(emailsToCleanup) } },
    });
    emailsToCleanup.clear();
  }
});

// Gera um CPF matematicamente válido e único por seed (algoritmo oficial —
// mesmo usado por `isValidCpf`), para não colidir entre casos de teste.
function validCpf(seed: number): string {
  const base = Array.from({ length: 9 }, (_, i) => (seed + i) % 10);
  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `sign-up-${Date.now()}-${emailCounter}@example.com`;
}

let cpfSeed = 0;
function uniqueValidCpf(): string {
  cpfSeed += 1;
  return validCpf(cpfSeed);
}

function validSignUpInput(overrides: Record<string, unknown> = {}) {
  const email = uniqueEmail();
  emailsToCleanup.add(email);

  return {
    name: "Maria Teste",
    birthDate: "1990-05-20",
    cpf: uniqueValidCpf(),
    zipCode: "01310-100",
    street: "Av. Paulista",
    addressNumber: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    email,
    password: "Senha@123",
    confirmPassword: "Senha@123",
    termsAccepted: true,
    ...overrides,
  };
}

describe("signUpCore — integração", () => {
  it("cadastro válido cria User com perfil, termsAcceptedAt setado pelo hook e inicia sessão (AC1.2, AUTH-04)", async () => {
    const input = validSignUpInput();

    const result = await signUpCore(input, new Headers());

    expect(result.ok).toBe(true);

    const created = await prisma.user.findUnique({ where: { email: input.email as string } });
    expect(created).not.toBeNull();
    expect(created?.name).toBe(input.name);
    expect(created?.cpf).toBe(input.cpf);
    expect(created?.birthDate).toBe(input.birthDate);
    expect(created?.zipCode).toBe("01310100");
    expect(created?.street).toBe(input.street);
    expect(created?.addressNumber).toBe(input.addressNumber);
    expect(created?.neighborhood).toBe(input.neighborhood);
    expect(created?.city).toBe(input.city);
    expect(created?.state).toBe(input.state);

    // termsAcceptedAt é setado pelo databaseHooks.user.create.before (T3),
    // nunca pela action — confirma que o valor persistido é um ISO datetime
    // real, não algo vindo do body da action (que não inclui esse campo).
    expect(created?.termsAcceptedAt).toBeTruthy();
    expect(() => new Date(created!.termsAcceptedAt)).not.toThrow();
    expect(Number.isNaN(new Date(created!.termsAcceptedAt).getTime())).toBe(false);

    // "inicia a sessão" (AC1.2): a chamada devolve um Set-Cookie de sessão
    // válido — usamos para chamar getSession e confirmar que a sessão
    // existe de fato no servidor, não só que uma função foi invocada.
    expect(result.ok && result.responseHeaders?.get("set-cookie")).toBeTruthy();

    const cookieHeader = buildCookieHeader(result);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
    expect(session?.user.email).toBe(input.email);
  });

  it("e-mail duplicado retorna o mesmo GENERIC_SIGNUP_ERROR e não cria linha extra (AC1.7, AUTH-03)", async () => {
    const first = validSignUpInput();
    const firstResult = await signUpCore(first, new Headers());
    expect(firstResult.ok).toBe(true);

    const countBefore = await prisma.user.count();

    const second = validSignUpInput({ email: first.email, cpf: uniqueValidCpf() });
    emailsToCleanup.add(second.email as string);
    const secondResult = await signUpCore(second, new Headers());

    expect(secondResult).toEqual({ ok: false, error: GENERIC_SIGNUP_ERROR });

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(countBefore);
  });

  it("CPF duplicado retorna o mesmo GENERIC_SIGNUP_ERROR e não cria linha extra (AC1.7, AUTH-03)", async () => {
    const sharedCpf = uniqueValidCpf();
    const first = validSignUpInput({ cpf: sharedCpf });
    const firstResult = await signUpCore(first, new Headers());
    expect(firstResult.ok).toBe(true);

    const countBefore = await prisma.user.count();

    const second = validSignUpInput({ cpf: sharedCpf });
    const secondResult = await signUpCore(second, new Headers());

    expect(secondResult).toEqual({ ok: false, error: GENERIC_SIGNUP_ERROR });

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(countBefore);

    const createdWithCpf = await prisma.user.count({ where: { cpf: sharedCpf } });
    expect(createdWithCpf).toBe(1);
  });

  it("dois signUpCore concorrentes com o MESMO CPF: exatamente um sucede (edge case de concorrência, spec.md)", async () => {
    const sharedCpf = uniqueValidCpf();
    const first = validSignUpInput({ cpf: sharedCpf });
    const second = validSignUpInput({ cpf: sharedCpf });

    const [resultA, resultB] = await Promise.all([
      signUpCore(first, new Headers()),
      signUpCore(second, new Headers()),
    ]);

    const results = [resultA, resultB];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ ok: false, error: GENERIC_SIGNUP_ERROR });

    const createdWithCpf = await prisma.user.count({ where: { cpf: sharedCpf } });
    expect(createdWithCpf).toBe(1);
  });

  it("dois signUpCore concorrentes com o MESMO e-mail: exatamente um sucede (edge case de concorrência, spec.md)", async () => {
    const sharedEmail = uniqueEmail();
    emailsToCleanup.add(sharedEmail);
    const first = validSignUpInput({ email: sharedEmail, cpf: uniqueValidCpf() });
    const second = validSignUpInput({ email: sharedEmail, cpf: uniqueValidCpf() });

    const [resultA, resultB] = await Promise.all([
      signUpCore(first, new Headers()),
      signUpCore(second, new Headers()),
    ]);

    const results = [resultA, resultB];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ ok: false, error: GENERIC_SIGNUP_ERROR });

    const createdWithEmail = await prisma.user.count({ where: { email: sharedEmail } });
    expect(createdWithEmail).toBe(1);
  });

  it("senha fora da política é rejeitada pelo Zod e não cria usuário (AC1.3, AUTH-05)", async () => {
    const countBefore = await prisma.user.count();

    const input = validSignUpInput({ password: "weak", confirmPassword: "weak" });
    const result = await signUpCore(input, new Headers());

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(GENERIC_SIGNUP_ERROR);
    expect(result.ok === false && result.fieldErrors?.password).toBeTruthy();

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(countBefore);
  });

  it("menor de 18 anos é rejeitado pelo Zod e não cria usuário (AC1.5, AUTH-05)", async () => {
    const countBefore = await prisma.user.count();

    const under18BirthDate = new Date();
    under18BirthDate.setUTCFullYear(under18BirthDate.getUTCFullYear() - 10);
    const birthDate = under18BirthDate.toISOString().slice(0, 10);

    const input = validSignUpInput({ birthDate });
    const result = await signUpCore(input, new Headers());

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(GENERIC_SIGNUP_ERROR);
    expect(result.ok === false && result.fieldErrors?.birthDate).toBeTruthy();

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(countBefore);
  });

  it("CPF inválido é rejeitado pelo Zod e não cria usuário (AC1.6, AUTH-05)", async () => {
    const countBefore = await prisma.user.count();

    const input = validSignUpInput({ cpf: "11111111111" });
    const result = await signUpCore(input, new Headers());

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(GENERIC_SIGNUP_ERROR);
    expect(result.ok === false && result.fieldErrors?.cpf).toBeTruthy();

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(countBefore);
  });
});

function buildCookieHeader(result: { ok: boolean; responseHeaders?: Headers }): string {
  const setCookie = result.responseHeaders?.get("set-cookie") ?? "";
  // Repassa só o par nome=valor de cada cookie (sem atributos como Path,
  // HttpOnly) — formato esperado pelo header `Cookie` de uma request.
  return setCookie
    .split(/,(?=\s*[^=;\s]+=)/)
    .map((part) => part.split(";")[0]!.trim())
    .join("; ");
}
