import { test, expect, type Locator, type Page } from "@playwright/test";

// E2E responsivo + teclado das 5 páginas de /app (design.md; spec.md P1
// Responsivo POLISH-17/18/20; roadmap item 9, Fase 4 T14). Segue o padrão
// de setup de viewport de e2e/shell.spec.ts (`test.use({ viewport })` por
// describe) e os helpers de signup/CPF já replicados em
// transactions/commitments/projections.spec.ts — cada teste cria seu
// próprio usuário.

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

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function signUp(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Data de nascimento").fill("1990-05-20");
  await page.getByLabel("CPF").fill(uniqueValidCpf());
  await page.getByLabel("CEP").fill("01310-100");
  await page.getByLabel("Logradouro").fill("Av. Paulista");
  await page.getByLabel("Número").fill("1000");
  await page.getByLabel("Bairro").fill("Bela Vista");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("/app");
}

async function createTransaction(
  page: Page,
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
  page: Page,
  options: {
    description: string;
    category: string;
    total: string;
    installmentCount: string;
    firstDueDate: string;
  },
) {
  await page.getByRole("button", { name: "Novo compromisso" }).click();
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

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Bounding box mínimo de alvo de toque (POLISH-18): a dimensão crítica de
// um botão/link retangular é o menor dos dois lados — a largura já sobra
// por causa do padding + texto na maioria dos controles, então usar o
// mínimo evita mascarar um alvo estreito.
async function assertMinimumTouchTarget(locator: Locator, min = 44) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, "elemento deveria ter bounding box mensurável").not.toBeNull();
  const criticalDimension = Math.min(box!.width, box!.height);
  expect(criticalDimension).toBeGreaterThanOrEqual(min);
}

// Foco visível (POLISH-20): a maioria dos controles do design system reseta
// `outline` (Tailwind `outline-none`, ver src/shared/components/ui/button.tsx)
// e usa `box-shadow` (Tailwind `ring`) no estado `:focus-visible`; links sem
// essa classe (ex.: Pagination) mantêm o outline nativo do browser. Um
// indicador é "visível" se qualquer um dos dois existir.
async function assertVisibleFocusIndicator(locator: Locator) {
  const hasIndicator = await locator.evaluate((el) => {
    const style = getComputedStyle(el);
    const outlineVisible =
      style.outlineStyle !== "none" && parseFloat(style.outlineWidth || "0") > 0;
    const boxShadowVisible = style.boxShadow !== "none" && style.boxShadow.trim() !== "";
    return outlineVisible || boxShadowVisible;
  });
  expect(hasIndicator).toBe(true);
}

// O `<DialogContent>` do design system anima `zoom-in-95`/`fade-in-0` em
// `duration-100` ao abrir (src/shared/components/ui/dialog.tsx). Medir a
// bounding box de um botão interno antes do fim dessa animação de escala
// captura um valor levemente menor que o final — sincroniza no evento
// `animationend` (condição observável) em vez de um `waitForTimeout` fixo.
async function waitForDialogAnimation(dialog: Locator) {
  await dialog.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        if (getComputedStyle(el).animationName === "none") {
          resolve();
          return;
        }
        const done = () => {
          el.removeEventListener("animationend", done);
          resolve();
        };
        el.addEventListener("animationend", done, { once: true });
        // Fallback: se o navegador não disparar o evento por algum motivo,
        // não trava o teste indefinidamente.
        setTimeout(resolve, 500);
      }),
  );
}

// Tab genérico até o elemento alvo ficar focado — robusto a mudanças na
// composição do shell (skip link, sidebar, topbar) que mudariam uma
// contagem fixa de Tabs.
async function tabUntilFocused(page: Page, locator: Locator, maxPresses = 100) {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    const isFocused = await locator
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (isFocused) return;
  }
  throw new Error("Elemento não alcançado via Tab dentro do limite de tentativas");
}

// `slug` é usado no e-mail gerado (precisa ser ASCII — um e-mail com
// acentos vindos de "Transações"/"Projeções" falha a validação do form de
// signup e trava o teste esperando por uma navegação que nunca acontece).
const PAGES = [
  { label: "Dashboard", slug: "dashboard", path: "/app" },
  { label: "Transações", slug: "transactions", path: "/app/transactions" },
  { label: "Compromissos", slug: "commitments", path: "/app/commitments" },
  { label: "Categorias", slug: "categories", path: "/app/categories" },
  { label: "Projeções", slug: "projections", path: "/app/projections" },
] as const;

test.describe("Responsive — sem overflow horizontal a 320px (POLISH-17)", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  for (const target of PAGES) {
    test(`${target.label} não gera scroll horizontal em 320px`, async ({ page }) => {
      await signUp(page, `Overflow ${target.label}`, uniqueEmail(`e2e-resp-ovf-${target.slug}`));
      await page.goto(target.path);

      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(noOverflow).toBe(true);
    });
  }
});

test.describe("Responsive — alvos de toque ≥44px em viewport mobile (POLISH-18)", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test("Dashboard: atalhos '+ Nova transação' e '+ Novo compromisso'", async ({ page }) => {
    await signUp(page, "Touch Dashboard", uniqueEmail("e2e-resp-touch-dash"));
    await page.goto("/app");

    await assertMinimumTouchTarget(page.getByRole("button", { name: "+ Nova transação" }));
    await assertMinimumTouchTarget(page.getByRole("button", { name: "+ Novo compromisso" }));
  });

  test("Transações: botão de criar e ações de linha (Editar/Excluir)", async ({ page }) => {
    await signUp(page, "Touch Transacoes", uniqueEmail("e2e-resp-touch-txn"));

    await page.goto("/app/transactions");
    await createTransaction(page, {
      type: "entrada",
      amount: "100,00",
      category: "Salário",
      date: todayISO(),
    });

    await assertMinimumTouchTarget(page.getByRole("button", { name: "+ Nova transação" }));
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Editar" }).first());
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Excluir" }).first());
  });

  test("Compromissos: botão de criar e alternância de parcela paga/prevista", async ({
    page,
  }) => {
    await signUp(page, "Touch Compromissos", uniqueEmail("e2e-resp-touch-commit"));

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Touch Target Item",
      category: "Cartão de crédito",
      total: "300,00",
      installmentCount: "3",
      firstDueDate: todayISO(),
    });

    await assertMinimumTouchTarget(page.getByRole("button", { name: "+ Novo compromisso" }));

    // Expande o card para revelar as parcelas e o toggle "Marcar como paga".
    await page.getByText("Touch Target Item").click();
    await assertMinimumTouchTarget(
      page.getByRole("button", { name: "Marcar como paga" }).first(),
    );
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Editar" }).first());
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Excluir" }).first());
  });

  test("Categorias: botão de criar e exclusão de categoria personalizada", async ({ page }) => {
    await signUp(page, "Touch Categorias", uniqueEmail("e2e-resp-touch-cat"));

    await page.goto("/app/categories");
    await page.getByLabel("Nome").fill("Categoria Toque");
    await page.getByRole("button", { name: "Criar categoria" }).click();
    // O item já foi criado no servidor neste ponto; o `router.refresh()` que
    // atualiza a lista pode legitimamente demorar mais que o timeout padrão
    // sob contenção pesada do Postgres de teste compartilhado entre workers
    // e2e em paralelo — mesmo padrão/justificativa de e2e/categories.spec.ts
    // (folga maior, sem enfraquecer a garantia).
    await expect(page.getByText("Categoria Toque")).toBeVisible({ timeout: 15000 });

    await assertMinimumTouchTarget(page.getByRole("button", { name: "Criar categoria" }));
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Excluir" }).first());
  });

  test("Projeções: navegador de mês (Anterior/Próximo)", async ({ page }) => {
    await signUp(page, "Touch Projecoes", uniqueEmail("e2e-resp-touch-proj"));
    await page.goto("/app/projections");

    await assertMinimumTouchTarget(page.getByRole("button", { name: "← Mês Anterior" }));
    await assertMinimumTouchTarget(page.getByRole("button", { name: "Próximo Mês →" }));
  });

  // POLISH-18 gap fix (validation.md Fix 4 / gap 4): os testes acima cobrem
  // só os controles de página; os botões internos de modais (Criar/Cancelar
  // no formulário de criação, Cancelar/Excluir no diálogo de confirmação)
  // nunca tinham sido medidos em 320px.
  test("Modais: botões internos de criação e exclusão (Criar/Cancelar, Excluir/Cancelar)", async ({
    page,
  }) => {
    await signUp(page, "Touch Modais", uniqueEmail("e2e-resp-touch-modal"));
    await page.goto("/app/transactions");

    // Modal de criação (TransactionModal): Cancelar/Criar
    await page.getByRole("button", { name: "+ Nova transação" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();
    await waitForDialogAnimation(createDialog);
    await assertMinimumTouchTarget(createDialog.getByRole("button", { name: "Cancelar" }));
    await assertMinimumTouchTarget(createDialog.getByRole("button", { name: "Criar" }));
    await createDialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(createDialog).not.toBeVisible();

    await createTransaction(page, {
      type: "entrada",
      amount: "50,00",
      category: "Salário",
      date: todayISO(),
    });

    // Diálogo de exclusão (DeleteTransactionDialog): Cancelar/Excluir
    await page.getByRole("button", { name: "Excluir" }).first().click();
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();
    await waitForDialogAnimation(deleteDialog);
    await assertMinimumTouchTarget(deleteDialog.getByRole("button", { name: "Cancelar" }));
    await assertMinimumTouchTarget(deleteDialog.getByRole("button", { name: "Excluir" }));
  });
});

test.describe("Responsive — navegação por teclado com foco visível (POLISH-20)", () => {
  test("Dashboard: Tab até '+ Nova transação' e ativa com Enter", async ({ page }) => {
    await signUp(page, "Keyboard Dashboard", uniqueEmail("e2e-resp-kbd-dash"));
    await page.goto("/app");

    const button = page.getByRole("button", { name: "+ Nova transação" });
    await tabUntilFocused(page, button);
    await assertVisibleFocusIndicator(button);

    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Transações: Tab pela paginação até 'Próxima' e ativa com Enter", async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page, "Keyboard Paginacao", uniqueEmail("e2e-resp-kbd-page"));

    await page.goto("/app/transactions");
    // PAGE_SIZE=20 (transactions-repository.ts) — precisa de 21 itens para
    // a Pagination renderizar (totalPages > 1).
    for (let i = 0; i < 21; i++) {
      await createTransaction(page, {
        type: "entrada",
        amount: "10,00",
        category: "Salário",
        date: todayISO(),
      });
    }

    await page.goto("/app/transactions");
    const nextLink = page.getByRole("link", { name: "Próxima →" });
    await tabUntilFocused(page, nextLink);
    await assertVisibleFocusIndicator(nextLink);

    await page.keyboard.press("Enter");
    await page.waitForURL(/\?page=2$/);
  });

  test("Projeções: Tab até o navegador de mês e avança com Enter", async ({ page }) => {
    await signUp(page, "Keyboard Projecoes", uniqueEmail("e2e-resp-kbd-proj"));
    await page.goto("/app/projections");

    const nextMonthButton = page.getByRole("button", { name: "Próximo Mês →" });
    await tabUntilFocused(page, nextMonthButton);
    await assertVisibleFocusIndicator(nextMonthButton);

    await page.keyboard.press("Enter");
    await page.waitForURL(/\?month=/);
  });

  // POLISH-20 gap fix (validation.md Fix 2): o toggle de expandir/recolher
  // parcelas em CommitmentList era um `<div onClick>` sem role/tabIndex —
  // inalcançável e inoperável por teclado. Agora expõe role="button" +
  // tabIndex + onKeyDown (Enter/Espaço), com o mesmo foco visível
  // (`focus-visible:ring`) dos demais controles.
  test("Compromissos: Tab até o toggle de expandir parcelas, expande com Enter e recolhe com Espaço", async ({
    page,
  }) => {
    await signUp(page, "Keyboard Compromissos", uniqueEmail("e2e-resp-kbd-commit"));

    await page.goto("/app/commitments");
    await createInstallmentCommitment(page, {
      description: "Toggle Teclado Item",
      category: "Cartão de crédito",
      total: "300,00",
      installmentCount: "3",
      firstDueDate: todayISO(),
    });

    const expandToggle = page.getByRole("button", {
      name: "Expandir parcelas de Toggle Teclado Item",
    });
    await tabUntilFocused(page, expandToggle);
    await assertVisibleFocusIndicator(expandToggle);

    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Marcar como paga" }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Recolher parcelas de Toggle Teclado Item" }),
    ).toBeVisible();

    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Marcar como paga" })).toHaveCount(0);
  });
});
