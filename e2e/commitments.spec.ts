import { test, expect } from "@playwright/test";

// E2E do fluxo de compromissos (design.md; spec.md, story "Compra
// parcelada"/"Financiamento"; roadmap item 4): signup → criar categoria →
// criar compromisso parcelado → verificar arredondamento → marcar parcela
// como paga. Segue o padrão de e2e/transactions.spec.ts: cada teste cria
// seu próprio usuário, interage via role/label (não seletores CSS crus),
// já que os componentes de formulário (Select, RadioGroup) são primitivas
// Base UI, não elementos nativos <select>/<input type="radio">.

// Gera um CPF matematicamente válido com dígitos-base independentes
// (10^9 combinações reais) — o Postgres de teste não é limpo entre
// execuções locais do E2E, então CPFs precisam ser únicos entre runs.
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

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

// spec.md Edge Cases: "usuário recém-cadastrado abre cada página THEN cada
// uma SHALL mostrar seu empty state com ação primária clara". Confirmado
// para dashboard/transações/categorias em outros specs e2e (validation.md);
// faltava para /app/commitments especificamente.
test("conta nova mostra o estado vazio de compromissos com ação primária", async ({ page }) => {
  const name = "Bia E2E Compromissos Vazio";
  const email = uniqueEmail("e2e-commit-empty");

  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Data de nascimento").fill("1990-01-01");
  await page.getByLabel("CPF").fill(uniqueValidCpf());
  await page.getByLabel("CEP").fill("12345-000");
  await page.getByLabel("Logradouro").fill("Rua Test");
  await page.getByLabel("Número").fill("123");
  await page.getByLabel("Bairro").fill("Bairro");
  await page.getByLabel("Cidade").fill("Cidade");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/commitments");
  await expect(page).toHaveURL(/\/app\/commitments$/);

  await expect(page.getByText("Nenhum compromisso ainda")).toBeVisible();
  await expect(
    page.getByText(
      "Crie seu primeiro compromisso (compra parcelada ou financiamento) para começar a acompanhar suas parcelas.",
    ),
  ).toBeVisible();
  // Ação primária clara: o atalho de criação do cabeçalho da página
  // permanece visível e operável mesmo com a lista vazia.
  await expect(page.getByRole("button", { name: "+ Novo compromisso" })).toBeVisible();
});

test("should create installment, verify rounding, and mark as paid", async ({ page }) => {
  const name = "Ana E2E Compromissos";
  const email = uniqueEmail("e2e-commit");

  // 1. Sign up with a test account
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Data de nascimento").fill("1990-01-01");
  await page.getByLabel("CPF").fill(uniqueValidCpf());
  await page.getByLabel("CEP").fill("12345-000");
  await page.getByLabel("Logradouro").fill("Rua Test");
  await page.getByLabel("Número").fill("123");
  await page.getByLabel("Bairro").fill("Bairro");
  await page.getByLabel("Cidade").fill("Cidade");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app$/);

  // 2. Create a "saida" category (the create-category form is inline, no modal)
  await page.goto("/app/categories");

  await page.getByLabel("Nome").fill("Eletrônicos");
  await page.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Saída" }).click();
  await page.getByRole("button", { name: "Criar categoria" }).click();

  await expect(page.getByText("Eletrônicos")).toBeVisible();

  // 3. Navigate to commitments and open the creation dialog
  await page.goto("/app/commitments");
  await page.getByRole("button", { name: "Novo compromisso" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Default mode is "installment_payment" (Compra Parcelada)
  await expect(page.getByRole("radio", { name: "Compra Parcelada" })).toBeChecked();

  // 4. Fill the commitment form (R$ 100,00 in 3x → 33,34 + 33,33 + 33,33)
  await page.getByLabel("Descrição").fill("Notebook");
  await page.getByLabel("Categoria").click();
  await page.getByRole("option", { name: "Eletrônicos" }).click();
  await page.getByLabel("Valor Total (R$)").fill("100,00");
  await page.getByLabel("Número de Parcelas").fill("3");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split("T")[0];
  await page.getByLabel("Data da Primeira Parcela").fill(dateString);

  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  // 5. Verify commitment is listed
  await expect(page.getByText("Notebook")).toBeVisible();
  await expect(page.getByText("Eletrônicos")).toBeVisible();

  // 6. Verify progress metrics (POLISH-14: contador legível de relance + barra)
  await expect(page.getByText("0/3")).toBeVisible(); // 0 pagas / 3 total
  await expect(page.getByText("R$ 0,00")).toBeVisible(); // 0 pago
  await expect(page.getByText("R$ 100,00").first()).toBeVisible(); // total / saldo (ambos R$ 100,00 antes de pagar)
  const progressBar = page.getByRole("progressbar");
  await expect(progressBar).toHaveAttribute("aria-valuenow", "0");

  // 7. Expand commitment to see installments
  await page.getByText("Notebook").click();

  // 8. Verify the 3 installments with correct rounding
  await expect(page.getByText("R$ 33,34")).toBeVisible(); // 1st installment
  const installments33_33 = page.getByText("R$ 33,33");
  await expect(installments33_33.first()).toBeVisible();
  expect(await installments33_33.count()).toBeGreaterThanOrEqual(2); // 2nd and 3rd

  // 9. Verify all are prevista (predicted)
  await expect(page.getByText("Prevista")).toHaveCount(3);

  // 10. Click "Marcar como paga" on the first installment to mark it as paid
  await page.getByRole("button", { name: "Marcar como paga" }).first().click();

  // 11. Verify the installment is now marked as paga
  await expect(page.getByText("✓ Paga").first()).toBeVisible();

  // 12. Verify progress updated (1/3 pagas, R$ 33,34 pago, R$ 66,66 saldo, barra em 33%)
  await expect(page.getByText("1/3").first()).toBeVisible();
  await expect(page.getByText("R$ 33,34").first()).toBeVisible(); // pago amount
  await expect(page.getByText("R$ 66,66")).toBeVisible(); // saldo restante
  await expect(progressBar).toHaveAttribute("aria-valuenow", "33");
});
