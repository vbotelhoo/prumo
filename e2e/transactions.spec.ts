import { expect, test } from "@playwright/test";

// E2E do fluxo de transações (spec.md, story "Transações", AC11; TXN-11):
// login → navegação real via page.goto → criar entrada → criar saída →
// ambas visíveis na listagem com tipo, categoria e valor corretos.
// Segue o padrão de e2e/auth.spec.ts: cada teste cria seu próprio usuário.

// Gera um CPF matematicamente válido com dígitos-base independentes
// (10^9 combinações reais) — o Postgres de teste não é limpo entre
// execuções locais do E2E, então CPFs precisam ser únicos entre runs.
// (Uma versão anterior gerava a base como `(seed + i) % 10`, que colapsa
// para só 10 valores possíveis independente da entropia da seed.)
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

test.describe("Fluxo de transações", () => {
  test("criar entrada e saída, ambas visíveis na listagem (TXN-11)", async ({
    page,
  }) => {
    const name = "João E2E Transações";
    const email = uniqueEmail("e2e-txn");

    // 1. Sign up (reutiliza pattern de auth.spec.ts)
    await page.goto("/signup");
    await fillSignUpForm(page, { name, email });
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(name, { exact: false })).toBeVisible();

    // 2. Navigate to /app/transactions
    await page.goto("/app/transactions");
    await expect(page).toHaveURL(/\/app\/transactions$/);

    // 3. Should show empty state initially
    await expect(page.getByText("Nenhuma transação registrada")).toBeVisible();

    // 4. Create first transaction (entrada)
    await page.getByRole("button", { name: "Nova transação" }).click();

    // Modal should be visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nova transação" })).toBeVisible();

    // Fill in the transaction form
    // Type is already set to "Entrada" by default
    const today = new Date().toISOString().split("T")[0];
    await page.getByLabel("Data").fill(today);
    await page.getByLabel("Valor").fill("5000,00");

    // Select category: "Salário" (default entrada category)
    await page.getByLabel("Categoria").click();
    await page.getByRole("option", { name: "Salário" }).click();

    // Description is optional, leave empty
    // Submit
    await page.getByRole("button", { name: "Criar" }).click();

    // Modal should close and page should refresh
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 5. Verify first transaction is visible in the list
    await expect(page.getByText("Salário")).toBeVisible();
    await expect(page.getByText("R$ 5.000,00")).toBeVisible();
    await expect(page.getByText("Entrada")).toBeVisible();

    // 6. Create second transaction (saída)
    await page.getByRole("button", { name: "Nova transação" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Change type to "Saída"
    await page.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Saída" }).click();

    // Fill in date and amount
    await page.getByLabel("Data").fill(today);
    await page.getByLabel("Valor").fill("250,37");

    // Select category: "Alimentação" (default saida category)
    await page.getByLabel("Categoria").click();
    await page.getByRole("option", { name: "Alimentação" }).click();

    // Submit
    await page.getByRole("button", { name: "Criar" }).click();

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 7. Verify both transactions are visible in the list
    // First transaction (entrada) should still be visible
    const salarioRows = page.getByText("Salário");
    await expect(salarioRows).toBeVisible();

    // Second transaction (saída) should also be visible
    const alimentacaoRows = page.getByText("Alimentação");
    await expect(alimentacaoRows).toBeVisible();

    // Values should both be visible
    const entradaValue = page.getByText("R$ 5.000,00");
    await expect(entradaValue).toBeVisible();

    const saidaValue = page.getByText("R$ 250,37");
    await expect(saidaValue).toBeVisible();

    // Verify type badges are distinct
    // This is a bit tricky since both "Entrada" and "Saída" might appear
    // We'll verify the page has both by checking multiple elements
    const entradaBadges = page.getByText("Entrada");
    await expect(entradaBadges).toHaveCount(1); // Only one entrada badge

    const saidaBadges = page.getByText("Saída");
    await expect(saidaBadges).toHaveCount(1); // Only one saída badge
  });
});
