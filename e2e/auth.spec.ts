import { expect, test } from "@playwright/test";

// E2E do fluxo de auth (design.md, componente 9; spec.md, stories "Cadastro
// com perfil completo" AC2, "Login e sessão" AC2/AC5/AC6, "Logout" AC1/AC2,
// "Página de termos" AC1; AUTH-14; tasks.md T10). Segue o padrão de
// `e2e/home.spec.ts`: navegação real via `page.goto`/interações de UI, sem
// atalhos de backend — cada teste cria seu próprio usuário via formulário.

// Gera um CPF matematicamente válido (algoritmo oficial dos dígitos
// verificadores), com dígitos-base independentes para ter cardinalidade
// real (10^9 combinações) — o Postgres de teste não é limpo entre
// execuções locais do E2E, então CPFs precisam ser únicos entre runs, não
// só dentro de uma run.
function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function uniqueValidCpf(): string {
  let base: number[];
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (base.every((digit) => digit === base[0])); // evita todos-dígitos-iguais (inválido)

  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

const PASSWORD = "Senha@123";

async function fillSignUpForm(
  page: import("@playwright/test").Page,
  options: { name: string; email: string },
) {
  await page.getByLabel("Nome").fill(options.name);
  await page.getByLabel("Data de nascimento").fill("1990-05-20");
  await page.getByLabel("CPF").fill(uniqueValidCpf());
  await page.getByLabel("CEP").fill("01310-100");
  await page.getByLabel("Logradouro").fill("Av. Paulista");
  await page.getByLabel("Número").fill("1000");
  await page.getByLabel("Bairro").fill("Bela Vista");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("E-mail").fill(options.email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

test.describe("Fluxo de auth", () => {
  test("cadastro válido autentica, logout encerra a sessão, login re-autentica e logado em /login|/signup redireciona para /app (AUTH-01/08/11/12/14)", async ({
    page,
  }) => {
    const name = "Maria E2E";
    const email = uniqueEmail("e2e-fluxo");

    // AC1.2 (spec.md, Cadastro): submissão válida cria a conta, inicia a
    // sessão e redireciona para a página interna protegida.
    await page.goto("/signup");
    await fillSignUpForm(page, { name, email });
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(name, { exact: false })).toBeVisible();

    // AC-logout.1 (spec.md, Logout): logout encerra a sessão e redireciona
    // para a home.
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);

    // AC-logout.2 (spec.md, Logout): sessão de fato destruída no servidor —
    // acessar a página interna pós-logout redireciona a `/login`.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);

    // AC-login.2 (spec.md, Login e sessão): credenciais corretas iniciam a
    // sessão e redirecionam para a página interna protegida.
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(name, { exact: false })).toBeVisible();

    // AC-login.6 (spec.md, Login e sessão; AUTH-11): usuário já autenticado
    // (sessão ativa desde o login em /app na linha acima) que acessa
    // `/login` ou `/signup` é redirecionado para a área interna.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app$/);

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/app$/);

    // Fecha o ciclo: logout de novo.
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("acessar /app deslogado redireciona para /login (AC-login.5, AUTH-11)", async ({
    page,
  }) => {
    const response = await page.goto("/app");

    await expect(page).toHaveURL(/\/login$/);
    expect(response?.status()).toBe(200);
  });

  test("/terms é acessível deslogado com conteúdo placeholder (AC-terms.1, AUTH-13)", async ({
    page,
  }) => {
    const response = await page.goto("/terms");

    expect(response?.status()).toBe(200);
    await expect(page.getByText("Termos de uso", { exact: true })).toBeVisible();
    await expect(page.getByText("Conteúdo placeholder", { exact: true })).toBeVisible();
  });
});
