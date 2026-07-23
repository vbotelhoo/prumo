import { test, expect } from "@playwright/test";

// Gera um CPF matematicamente válido (mesmo algoritmo de e2e/auth.spec.ts e
// e2e/projections.spec.ts) — o form de signup rejeita CPFs com dígitos
// verificadores inválidos.
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
  options: {
    description: string;
    category: string;
    total: string;
    installmentCount: string;
    firstDueDate: string;
  },
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

test.describe("Dashboard", () => {
  test("summary matches the same calculation as /app/projections (DASH-01)", async ({ page }) => {
    await signUp(page, "Dash Summary", `dash-summary-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "entrada",
      amount: "1000,00",
      category: "Salário",
      date: today,
    });
    await createTransaction(page, {
      type: "saida",
      amount: "300,00",
      category: "Alimentação",
      date: today,
    });

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Test 3x Payment",
      category: "Cartão de crédito",
      total: "600,00",
      installmentCount: "3",
      firstDueDate: today,
    });

    // entradas = 1000; saidas avulsas = 300; parcelas do mes = 200 (1a de 3x)
    // saidasPrevistas = 500; saldoProjetado = 500
    await page.goto("/app");
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
    const saldoText = page.locator("text=Saldo Projetado").locator("..").locator("div").last();
    await expect(saldoText).toContainText("500");
  });

  test("chart sums a one-off expense and an installment in the same category into a single slice (DASH-07)", async ({
    page,
  }) => {
    await signUp(page, "Dash Chart", `dash-chart-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "saida",
      amount: "100,00",
      category: "Alimentação",
      date: today,
    });

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Compra parcelada",
      category: "Alimentação",
      total: "300,00",
      installmentCount: "2",
      firstDueDate: today,
    });

    // 100 (avulsa) + 150 (1a de 2 parcelas, no mes atual) = 250 na mesma
    // fatia "Alimentação" (a 2a parcela cai no mes seguinte)
    await page.goto("/app");
    await expect(page.getByText("Alimentação — R$ 250,00")).toBeVisible();
  });

  test("empty month shows zeroed summary, empty chart and empty upcoming list (DASH-02/06/10)", async ({
    page,
  }) => {
    await signUp(page, "Dash Empty", `dash-empty-${Date.now()}@example.com`);

    await expect(page.locator("text=R$ 0,00").first()).toBeVisible();
    await expect(page.getByText("Nenhum gasto neste mês")).toBeVisible();
    await expect(page.getByText("Nenhuma parcela pendente este mês")).toBeVisible();
  });

  test("prevista installment appears in the list, paga installment does not (DASH-09)", async ({
    page,
  }) => {
    await signUp(page, "Dash Upcoming", `dash-upcoming-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Conta a pagar",
      category: "Alimentação",
      total: "150,00",
      installmentCount: "2",
      firstDueDate: today,
    });
    await createInstallmentCommitment(page, {
      description: "Conta ja paga",
      category: "Alimentação",
      total: "50,00",
      installmentCount: "2",
      firstDueDate: today,
    });

    // Marca "Conta ja paga" como paga na própria página de compromissos:
    // expande o card (clique no header) e clica no status da parcela.
    await page.getByText("Conta ja paga").click();
    await page.getByText("Prevista", { exact: true }).first().click();
    await expect(page.getByText("✓ Paga")).toBeVisible();

    await page.goto("/app");
    await expect(page.getByText("Conta a pagar")).toBeVisible();
    await expect(page.getByText("Conta ja paga")).not.toBeVisible();
  });

  test("marking an installment as paid from the dashboard removes it from the list without a full page navigation, and the summary/chart keep counting it (DASH-13/15)", async ({
    page,
  }) => {
    await signUp(page, "Dash MarkPaid", `dash-markpaid-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Parcela do dashboard",
      category: "Alimentação",
      total: "250,00",
      installmentCount: "2",
      firstDueDate: today,
    });

    await page.goto("/app");
    await expect(page.getByText("Parcela do dashboard")).toBeVisible();
    const saldoBefore = await page
      .locator("text=Saldo Projetado")
      .locator("..")
      .locator("div")
      .last()
      .textContent();

    const urlBeforeClick = page.url();
    await page
      .locator("li", { hasText: "Parcela do dashboard" })
      .getByRole("button", { name: "Marcar como paga" })
      .click();

    await expect(page.getByText("Parcela do dashboard")).not.toBeVisible();
    expect(page.url()).toBe(urlBeforeClick);

    const saldoAfter = await page
      .locator("text=Saldo Projetado")
      .locator("..")
      .locator("div")
      .last()
      .textContent();
    expect(saldoAfter).toBe(saldoBefore);
    // 125 = 1a de 2 parcelas (250 / 2) no mes atual — segue contando nas
    // saidas mesmo apos marcada como paga (DASH-15)
    await expect(page.getByText("Alimentação — R$ 125,00")).toBeVisible();
  });

  test("two accounts in the same month only see their own dashboard data (AD-012)", async ({
    page,
    browser,
  }) => {
    const today = new Date().toISOString().split("T")[0];

    await signUp(page, "Dash Acc1", `dash-acc1-${Date.now()}@example.com`);
    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "saida",
      amount: "700,00",
      category: "Alimentação",
      date: today,
    });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signUp(page2, "Dash Acc2", `dash-acc2-${Date.now()}@example.com`);
    await page2.goto("/app/transactions");
    await createTransaction(page2, {
      type: "saida",
      amount: "150,00",
      category: "Alimentação",
      date: today,
    });

    await page.goto("/app");
    await expect(page.getByText("Alimentação — R$ 700,00")).toBeVisible();
    await expect(page.getByText("Alimentação — R$ 150,00")).not.toBeVisible();

    await page2.goto("/app");
    await expect(page2.getByText("Alimentação — R$ 150,00")).toBeVisible();
    await expect(page2.getByText("Alimentação — R$ 700,00")).not.toBeVisible();

    await context2.close();
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});
