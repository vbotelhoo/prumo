import { afterEach, describe, expect, it } from "vitest";

import { signInCore } from "../actions/sign-in-core";
import { signOutCore } from "../actions/sign-out-core";
import { signUpCore } from "../actions/sign-up-core";
import { auth } from "../domain/auth";
import { GENERIC_LOGIN_ERROR } from "../domain/schemas";
import { prisma } from "@/shared";

// Integração (design.md, componente 9; spec.md, story "Login e sessão" e
// "Logout"; tasks.md T7): exercita `signInCore`/`signOutCore` contra um
// Postgres real. Reusa `signUpCore` só para preparar um usuário existente —
// não é objeto de teste desta suíte (coberto em sign-up.integration.test.ts).

const emailsToCleanup = new Set<string>();

afterEach(async () => {
  if (emailsToCleanup.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: Array.from(emailsToCleanup) } },
    });
    emailsToCleanup.clear();
  }
});

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

let counter = 0;
async function createUser(): Promise<{ email: string; password: string }> {
  counter += 1;
  const email = `sign-in-${Date.now()}-${counter}@example.com`;
  const password = "Senha@123";
  emailsToCleanup.add(email);

  const result = await signUpCore(
    {
      name: "Usuário Login",
      birthDate: "1990-05-20",
      cpf: validCpf(100 + counter),
      zipCode: "01310-100",
      street: "Av. Paulista",
      addressNumber: "1000",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      email,
      password,
      confirmPassword: password,
      termsAccepted: true,
    },
    new Headers(),
  );

  if (!result.ok) {
    throw new Error(`Falha ao preparar fixture de usuário: ${result.error}`);
  }

  return { email, password };
}

function buildCookieHeader(responseHeaders?: Headers): string {
  const setCookie = responseHeaders?.get("set-cookie") ?? "";
  return setCookie
    .split(/,(?=\s*[^=;\s]+=)/)
    .map((part) => part.split(";")[0]!.trim())
    .join("; ");
}

describe("signInCore — integração", () => {
  it("login com e-mail inexistente retorna GENERIC_LOGIN_ERROR (AC-login.3, AUTH-09)", async () => {
    const result = await signInCore(
      { email: "nao-existe@example.com", password: "Senha@123" },
      new Headers(),
    );

    expect(result).toEqual({ ok: false, error: GENERIC_LOGIN_ERROR });
  });

  it("login com senha errada retorna GENERIC_LOGIN_ERROR (AC-login.3, AUTH-09)", async () => {
    const { email } = await createUser();

    const result = await signInCore({ email, password: "SenhaErrada@1" }, new Headers());

    expect(result).toEqual({ ok: false, error: GENERIC_LOGIN_ERROR });
  });

  it("login válido cria sessão (AC-login.2, AUTH-08)", async () => {
    const { email, password } = await createUser();

    const result = await signInCore({ email, password }, new Headers());

    expect(result.ok).toBe(true);
    expect(result.ok && result.responseHeaders?.get("set-cookie")).toBeTruthy();

    const cookieHeader = buildCookieHeader(result.responseHeaders);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
    expect(session?.user.email).toBe(email);
  });
});

describe("signOutCore — integração", () => {
  it("encerra a sessão no servidor: getSession com o cookie pós-logout retorna null (AC-logout.2, AUTH-12)", async () => {
    const { email, password } = await createUser();

    const signInResult = await signInCore({ email, password }, new Headers());
    expect(signInResult.ok).toBe(true);
    const cookieHeader = buildCookieHeader(signInResult.ok ? signInResult.responseHeaders : undefined);

    const sessionBeforeLogout = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });
    expect(sessionBeforeLogout?.user.email).toBe(email);

    await signOutCore(new Headers({ cookie: cookieHeader }));

    const sessionAfterLogout = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });
    expect(sessionAfterLogout).toBeNull();
  });
});
