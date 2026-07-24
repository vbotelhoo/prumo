import { test, expect, type Page, type Locator } from "@playwright/test";

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

async function signUp(page: Page, name: string, email: string) {
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

// Aciona um atalho "+ Nova transação"/"+ Novo compromisso" no escopo que o
// chamador indicar (dashboard via `#main-content`, ou página de dados via
// `page`) e devolve o modal já escopado por `getByRole("dialog")` +
// heading — evita colidir com o outro modal ou com a página de transações
// (risco mapeado em design.md: dois modais no dashboard + botão homônimo em
// /app/transactions).
async function openDialogFrom(
  page: Page,
  scope: Page | Locator,
  buttonName: string,
  dialogHeading: string,
): Promise<Locator> {
  await scope.getByRole("button", { name: buttonName }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: dialogHeading }) });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function fillTransactionModal(
  dialog: Locator,
  page: Page,
  options: { type?: "entrada" | "saida"; amount: string; category: string; date: string },
) {
  if (options.type === "saida") {
    await dialog.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Saída" }).click();
  }

  await dialog.getByLabel("Data").fill(options.date);
  await dialog.getByLabel("Valor").fill(options.amount);
  await dialog.getByLabel("Categoria").click();
  await page.getByRole("option", { name: options.category }).click();
}

async function createTransaction(
  page: Page,
  options: { type: "entrada" | "saida"; amount: string; category: string; date: string },
) {
  const dialog = await openDialogFrom(page, page, "Nova transação", "Nova transação");
  await fillTransactionModal(dialog, page, options);
  await dialog.getByRole("button", { name: "Criar" }).click();
  await expect(dialog).not.toBeVisible();
}

async function createInstallmentCommitment(
  page: Page,
  options: {
    description: string;
    category: string;
    total: string;
    installmentCount: string;
    firstDueDate: string;
  },
) {
  const dialog = await openDialogFrom(page, page, "Novo compromisso", "Novo Compromisso");

  await dialog.getByLabel("Descrição").fill(options.description);
  await dialog.getByLabel("Categoria").click();
  await page.getByRole("option", { name: options.category }).click();
  await dialog.getByLabel("Valor Total (R$)").fill(options.total);
  await dialog.getByLabel("Número de Parcelas").fill(options.installmentCount);
  await dialog.getByLabel("Data da Primeira Parcela").fill(options.firstDueDate);

  await dialog.getByRole("button", { name: "Criar" }).click();
  await expect(dialog).not.toBeVisible();
}

// StatCard (T3) renderiza `<span>{label}</span><span>{formatBRL(value)}</span>`
// dentro do mesmo Card — localiza o span de valor a partir do label.
function statCardValue(page: Page, label: string): Locator {
  return page
    .locator('[data-slot="stat-card"]', { hasText: label })
    .locator("span")
    .last();
}

function heroBalance(page: Page): Locator {
  return page.getByTestId("dashboard-hero-saldo");
}

test.describe("Dashboard", () => {
  test("hero exhibits the projected saldo as the sole prominent number, matching the entradas/saidas/comprometido cards (AC1, AC5, DASH-01)", async ({
    page,
  }) => {
    await signUp(page, "Dash Summary", `dash-summary-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app");
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
    // saidasPrevistas = 500; saldoProjetado = 500; comprometido = 200
    await page.goto("/app");

    // AC1: um único número Display de destaque no viewport (`text-4xl`),
    // com numerais tabulares.
    await expect(heroBalance(page)).toHaveText("R$ 500,00");
    await expect(heroBalance(page)).toHaveClass(/text-4xl/);
    await expect(heroBalance(page)).toHaveClass(/tabular-nums/);
    await expect(page.locator('#main-content [class*="text-4xl"]')).toHaveCount(1);

    // AC2: saldo positivo usa cor de texto primária, não a semântica de saída.
    await expect(heroBalance(page)).toHaveClass(/text-foreground/);
    await expect(heroBalance(page)).not.toHaveClass(/text-negative/);

    await expect(statCardValue(page, "Entradas previstas")).toHaveText("R$ 1.000,00");
    await expect(statCardValue(page, "Saídas previstas")).toHaveText("R$ 500,00");
    // Comprometido usa a semântica de Saída (DESIGN.md), nunca azul.
    const comprometido = statCardValue(page, "Total comprometido");
    await expect(comprometido).toHaveText("R$ 200,00");
    await expect(comprometido).toHaveClass(/text-negative/);
  });

  test("quick-add: creating a transaction from the dashboard shortcut updates the hero and cards without a manual page navigation (AC4)", async ({
    page,
  }) => {
    await signUp(page, "Dash Quick", `dash-quick-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app");
    await expect(heroBalance(page)).toHaveText("R$ 0,00");

    const urlBeforeClick = page.url();
    await createTransaction(page, {
      type: "entrada",
      amount: "700,00",
      category: "Salário",
      date: today,
    });

    // Nenhuma navegação de página ocorreu — só re-render via router.refresh().
    expect(page.url()).toBe(urlBeforeClick);
    await expect(heroBalance(page)).toHaveText("R$ 700,00");
    await expect(statCardValue(page, "Entradas previstas")).toHaveText("R$ 700,00");
  });

  test("quick-add: the transaction and commitment modals are mutually exclusive dialogs on the dashboard (AC4 composition)", async ({
    page,
  }) => {
    await signUp(page, "Dash Modals", `dash-modals-${Date.now()}@example.com`);

    await page.goto("/app");
    const txnDialog = await openDialogFrom(page, page, "Nova transação", "Nova transação");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await txnDialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const commitmentDialog = await openDialogFrom(page, page, "Novo compromisso", "Novo Compromisso");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(commitmentDialog.getByRole("heading", { name: "Novo Compromisso" })).toBeVisible();
  });

  test("the 4 emoji navigation buttons that used to duplicate the sidebar are gone from the dashboard (AC3)", async ({
    page,
  }) => {
    await signUp(page, "Dash NoEmoji", `dash-noemoji-${Date.now()}@example.com`);
    await page.goto("/app");

    const main = page.locator("#main-content");
    for (const emoji of ["💰", "📋", "🏷️", "📈"]) {
      await expect(main).not.toContainText(emoji);
    }
    // Os atalhos de ação substitutos existem no lugar deles.
    await expect(main.getByRole("button", { name: "Nova transação" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Novo compromisso" })).toBeVisible();
  });

  test("chart sums a one-off expense and an installment in the same category into a single slice (DASH-07)", async ({
    page,
  }) => {
    await signUp(page, "Dash Chart", `dash-chart-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app");
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

  test("empty month shows R$ 0,00 in the hero and empty states with primary action in every card, never a blank area (AC6, DASH-02/06/10)", async ({
    page,
  }) => {
    await signUp(page, "Dash Empty", `dash-empty-${Date.now()}@example.com`);
    await page.goto("/app");

    await expect(heroBalance(page)).toHaveText("R$ 0,00");
    await expect(statCardValue(page, "Entradas previstas")).toHaveText("R$ 0,00");
    await expect(statCardValue(page, "Saídas previstas")).toHaveText("R$ 0,00");
    await expect(statCardValue(page, "Total comprometido")).toHaveText("R$ 0,00");

    await expect(page.getByText("Nenhum gasto neste mês")).toBeVisible();
    await expect(page.getByText("Nenhuma parcela pendente este mês")).toBeVisible();
  });

  test("negative saldo is shown in full BRL with the semantic negative color, sign included in the tabular width (AC2 edge case, DASH-03)", async ({
    page,
  }) => {
    await signUp(page, "Dash Negative", `dash-negative-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app");
    await createTransaction(page, {
      type: "saida",
      amount: "800,00",
      category: "Alimentação",
      date: today,
    });

    // Sem entradas no mês e uma saída de 800 -> saldo = -800,00
    await page.goto("/app");
    const hero = heroBalance(page);
    await expect(hero).toHaveText("-R$ 800,00");
    await expect(hero).toHaveClass(/text-negative/);
    await expect(hero).not.toHaveClass(/text-foreground/);
    await expect(hero).toHaveClass(/tabular-nums/);
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
    // expande o card (clique no header) e clica em "Marcar como paga" na
    // primeira parcela (CommitmentList expõe um botão por parcela, não um
    // clique implícito na linha inteira — POLISH-14/16).
    await page.getByText("Conta ja paga").click();
    await page.getByRole("button", { name: "Marcar como paga" }).first().click();
    await expect(page.getByText("✓ Paga")).toBeVisible();

    await page.goto("/app");
    await expect(page.getByText("Conta a pagar")).toBeVisible();
    await expect(page.getByText("Conta ja paga")).not.toBeVisible();

    // DASH-11: cada item da lista mostra descrição, categoria, valor
    // (75,00 = 1a de 2 parcelas de 150,00) e vencimento.
    const row = page.locator("li", { hasText: "Conta a pagar" });
    await expect(row.getByText("Alimentação")).toBeVisible();
    await expect(row.getByText("R$ 75,00")).toBeVisible();
    await expect(row.getByText(today)).toBeVisible();
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
    const saldoBefore = await heroBalance(page).textContent();

    const urlBeforeClick = page.url();
    await page
      .locator("li", { hasText: "Parcela do dashboard" })
      .getByRole("button", { name: "Marcar como paga" })
      .click();

    await expect(page.getByText("Parcela do dashboard")).not.toBeVisible();
    expect(page.url()).toBe(urlBeforeClick);

    const saldoAfter = await heroBalance(page).textContent();
    expect(saldoAfter).toBe(saldoBefore);
    // 125 = 1a de 2 parcelas (250 / 2) no mes atual — segue contando nas
    // saidas mesmo apos marcada como paga (DASH-15)
    await expect(page.getByText("Alimentação — R$ 125,00")).toBeVisible();
  });

  test("failed mark-as-paid action keeps the item in the list and shows an inline error (DASH-14)", async ({
    page,
    browser,
  }) => {
    await signUp(page, "Dash ErrorPath", `dash-errorpath-${Date.now()}@example.com`);
    const today = new Date().toISOString().split("T")[0];

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Parcela que vai sumir",
      category: "Alimentação",
      total: "100,00",
      installmentCount: "2",
      firstDueDate: today,
    });

    // Renderiza o dashboard com a parcela na lista — o installmentId fica
    // preso nesse render até o próximo refresh do cliente.
    await page.goto("/app");
    await expect(page.getByText("Parcela que vai sumir")).toBeVisible();

    // Em outra aba com a mesma sessão, exclui o compromisso dono dessa
    // parcela: o servidor deixa de reconhecer o installmentId que o
    // cliente acima ainda tem renderizado.
    const context2 = await browser.newContext();
    await context2.addCookies(await page.context().cookies());
    const page2 = await context2.newPage();
    await page2.goto("/app/commitments");
    await page2.getByRole("button", { name: "Excluir" }).click();
    await page2.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page2.getByRole("dialog")).not.toBeVisible();
    await context2.close();

    // De volta à lista desatualizada: clicar em "Marcar como paga" envia
    // um installmentId que o servidor não encontra mais -> ação falha.
    await page
      .locator("li", { hasText: "Parcela que vai sumir" })
      .getByRole("button", { name: "Marcar como paga" })
      .click();

    // Item permanece na lista (ação falhou) e a mensagem de erro é exibida.
    await expect(page.getByText("Parcela que vai sumir")).toBeVisible();
    await expect(page.getByText("Parcela não encontrada")).toBeVisible();
  });

  test("two accounts in the same month only see their own dashboard data (AD-012)", async ({
    page,
    browser,
  }) => {
    const today = new Date().toISOString().split("T")[0];

    await signUp(page, "Dash Acc1", `dash-acc1-${Date.now()}@example.com`);
    await page.goto("/app");
    await createTransaction(page, {
      type: "saida",
      amount: "700,00",
      category: "Alimentação",
      date: today,
    });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signUp(page2, "Dash Acc2", `dash-acc2-${Date.now()}@example.com`);
    await page2.goto("/app");
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
