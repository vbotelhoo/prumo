import { test, expect, type Locator, type Page } from "@playwright/test";

// Gera um CPF matematicamente válido (mesmo algoritmo de e2e/auth.spec.ts) —
// o form de signup rejeita CPFs com dígitos verificadores inválidos.
function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function uniqueValidCpf(): string {
  let base: number[];
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (base.every((digit) => digit === base[0]));

  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

const PASSWORD = "Senha@123";

async function signUp(page: import("@playwright/test").Page, name: string, email: string) {
  await page.goto("/signup");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="birthDate"]', "1990-01-01");
  await page.fill('input[name="cpf"]', uniqueValidCpf());
  await page.fill('input[name="zipCode"]', "01310100");
  await page.fill('input[name="street"]', "Test Street");
  await page.fill('input[name="addressNumber"]', "123");
  await page.fill('input[name="neighborhood"]', "Test");
  await page.fill('input[name="city"]', "Test City");
  await page.fill('input[name="state"]', "SP");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.getByRole("checkbox").check();
  await page.click('button:has-text("Criar Conta")');
  await page.waitForURL("/app");
}

async function createTransaction(
  page: import("@playwright/test").Page,
  options: { type: "entrada" | "saida"; amount: string; category: string; date: string },
) {
  await page.getByRole("button", { name: "Nova transação" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  if (options.type === "saida") {
    await page.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Saída" }).click();
  }

  await page.getByLabel("Data").fill(options.date);
  await page.getByLabel("Valor").fill(options.amount);
  await page.getByLabel("Categoria").click();
  await page.getByRole("option", { name: options.category }).click();

  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

async function createInstallmentCommitment(
  page: import("@playwright/test").Page,
  options: { description: string; category: string; total: string; installmentCount: string; firstDueDate: string },
) {
  await page.getByRole("button", { name: "Novo Compromisso" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Descrição").fill(options.description);
  await page.getByLabel("Categoria").click();
  await page.getByRole("option", { name: options.category }).click();
  await page.getByLabel("Valor Total (R$)").fill(options.total);
  await page.getByLabel("Número de Parcelas").fill(options.installmentCount);
  await page.getByLabel("Data da Primeira Parcela").fill(options.firstDueDate);

  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

// StatCard (T3, reaproveitado por ProjectionSummary no T13) renderiza
// `<span>{label}</span><span>{formatBRL(value)}</span>` dentro do mesmo
// Card — localiza o span de valor a partir do label (mesmo helper de
// e2e/dashboard.spec.ts, já que a estrutura é a mesma).
function statCardValue(page: Page, label: string): Locator {
  return page
    .locator('[data-slot="stat-card"]', { hasText: label })
    .locator("span")
    .last();
}

test.describe("Projections", () => {
  test("complete projection flow: entrada + saida + parcelamento 3x", async ({ page }) => {
    await signUp(page, "Proj Test", `proj-test-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    // Create entrada (income)
    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "entrada",
      amount: "1000,00",
      category: "Salário",
      date: today,
    });

    // Create saida avulsa (one-off expense)
    await createTransaction(page, {
      type: "saida",
      amount: "300,00",
      category: "Alimentação",
      date: today,
    });

    // Create parcelamento 3x (commitment with 3 installments)
    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Test 3x Payment",
      category: "Cartão de crédito",
      total: "600,00",
      installmentCount: "3",
      firstDueDate: today,
    });

    // Navigate to projections
    await page.goto("/app/projections");

    // Verify aggregates match manual calculation
    // entradas = 1000
    // saidas avulsas = 300
    // parcelas do mes = 200 (first of 3x)
    // saidasPrevistas = 300 + 200 = 500
    // saldoProjetado = 1000 - 500 = 500
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
    const saldoText = statCardValue(page, "Saldo Projetado");
    await expect(saldoText).toContainText("500");

    // POLISH-15: Total Comprometido usa a semântica de Saída (DESIGN.md),
    // nunca azul — mesmo tratamento do StatCard "Total comprometido" do
    // dashboard.
    const comprometido = statCardValue(page, "Total Comprometido");
    await expect(comprometido).toContainText("200");
    await expect(comprometido).toHaveClass(/text-negative/);
    await expect(comprometido).not.toHaveClass(/text-blue/);
  });

  test("navigate between months", async ({ page }) => {
    await signUp(page, "Nav Test", `nav-test-${Date.now()}@example.com`);

    // Go to projections
    await page.goto("/app/projections");

    // Get current month URL
    const currentUrl = page.url();
    expect(currentUrl).toContain("projections");

    // Click next month (client-side navigation, must wait for URL to update)
    await page.click('button:has-text("Próximo Mês")');
    await page.waitForURL(/\?month=/);
    const nextUrl = page.url();
    expect(nextUrl).not.toBe(currentUrl);
    expect(nextUrl).toContain("?month=");

    // Click previous month (back to current). The Link always renders an
    // explicit `?month=` param, so it never round-trips to the bare initial
    // URL — assert on the "already on current month" signal instead.
    await page.click('button:has-text("Mês Anterior")');
    await expect(page.locator('button:has-text("Voltar ao Mês Atual")')).not.toBeVisible();
  });

  test("invalid ?month param falls back to current", async ({ page }) => {
    await signUp(page, "Invalid Test", `invalid-test-${Date.now()}@example.com`);

    // Try invalid month
    await page.goto("/app/projections?month=2026-13");
    // Should still render (fallback to current month)
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
  });

  test("empty month displays zeros", async ({ page }) => {
    await signUp(page, "Empty Test", `empty-test-${Date.now()}@example.com`);

    // Go to distant future month with no data
    await page.goto("/app/projections?month=2050-06");
    // All aggregates should be R$ 0,00
    const cards = page.locator("text=R$ 0,00");
    await expect(cards.first()).toBeVisible();
  });

  test("two accounts in same month show separate projections", async ({ page, browser }) => {
    const today = new Date().toISOString().split("T")[0];

    // Account 1
    await signUp(page, "Acc1 Test", `acc1-test-${Date.now()}@example.com`);

    // Create transaction for account 1
    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "entrada",
      amount: "5000,00",
      category: "Salário",
      date: today,
    });

    // Get projection for account 1
    await page.goto("/app/projections");
    const proj1Saldo = statCardValue(page, "Saldo Projetado");
    const saldo1Text = await proj1Saldo.textContent();

    // Account 2 in a genuinely separate browser context (isolated cookies —
    // `context.newPage()` would share account 1's session and get redirected
    // away from /signup since the app bounces authenticated users to /app).
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signUp(page2, "Acc2 Test", `acc2-test-${Date.now()}@example.com`);

    // Create different transaction for account 2
    await page2.goto("/app/transactions");
    await createTransaction(page2, {
      type: "saida",
      amount: "1000,00",
      category: "Alimentação",
      date: today,
    });

    // Get projection for account 2
    await page2.goto("/app/projections");
    const proj2Saldo = statCardValue(page2, "Saldo Projetado");
    const saldo2Text = await proj2Saldo.textContent();

    // Projections should be different (formatBRL uses pt-BR grouping and a
    // non-breaking space after "R$", e.g. "R$ 5.000,00" / "-R$ 1.000,00")
    expect(saldo1Text).not.toBe(saldo2Text);
    expect(saldo1Text).toContain("5.000,00");
    expect(saldo2Text).toContain("1.000,00");
    expect(saldo2Text?.startsWith("-")).toBe(true);
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/app/projections");
    // Should redirect to /login
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });

  test("projections link in the app sidebar navigates to projections", async ({ page }) => {
    await signUp(page, "Link Test", `link-test-${Date.now()}@example.com`);

    // From /app home, click the "Projeções" sidebar nav link (app-polish
    // T9: o antigo grid de 4 botões-emoji do dashboard foi removido — a
    // navegação para as seções passa a ser exclusivamente a sidebar/drawer
    // do AppShell, já coberta por e2e/shell.spec.ts).
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Projeções" })
      .click();

    // Should navigate to /app/projections
    await page.waitForURL("/app/projections");
    expect(page.url()).toContain("/app/projections");

    // Projections page should be visible
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
  });
});
