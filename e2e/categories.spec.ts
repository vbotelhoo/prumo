import { expect, test } from "@playwright/test";

// E2E do fluxo de categorias (spec.md, story "Polish das páginas de
// dados"; roadmap item 9, T12): a página /app/categories não tinha spec
// e2e próprio antes desta task — happy path de criação, exclusão e estado
// vazio padrão. Segue o padrão de e2e/transactions.spec.ts e
// e2e/commitments.spec.ts: cada teste cria seu próprio usuário via signup
// (isolamento), interage via role/label (Select é uma primitiva Base UI,
// não um <select> nativo).

// Gera um CPF matematicamente válido (mesmo algoritmo dos demais specs
// e2e) — o Postgres de teste não é limpo entre execuções locais, então
// CPFs precisam ser únicos entre runs.
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

async function signUp(page: import("@playwright/test").Page, name: string, email: string) {
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
  await expect(page).toHaveURL(/\/app$/);
}

test.describe("Fluxo de categorias", () => {
  test("conta nova mostra o estado vazio padrão nas duas seções 'Personalizadas' (POLISH-03)", async ({
    page,
  }) => {
    await signUp(page, "Cat E2E Vazio", uniqueEmail("e2e-cat-empty"));

    await page.goto("/app/categories");
    await expect(page).toHaveURL(/\/app\/categories$/);

    // Categorias padrão (seed) aparecem — a seção "Personalizadas" de
    // ambos os tipos mostra o estado vazio compartilhado, já que a conta
    // é nova e ainda não tem nenhuma categoria própria.
    await expect(
      page.getByText("Nenhuma categoria personalizada de entrada"),
    ).toBeVisible();
    await expect(
      page.getByText("Nenhuma categoria personalizada de saída"),
    ).toBeVisible();
  });

  test("criar categoria personalizada → aparece na seção correta (tipo Saída)", async ({
    page,
  }) => {
    await signUp(page, "Cat E2E Criar", uniqueEmail("e2e-cat-create"));

    await page.goto("/app/categories");

    // "Streaming" não colide com nenhuma categoria padrão do seed (ex.:
    // "Assinaturas e serviços" seria um match parcial de "Assinaturas" e
    // quebraria o `getByText` em modo estrito).
    await page.getByLabel("Nome").fill("Streaming");
    await page.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Saída" }).click();
    await page.getByRole("button", { name: "Criar categoria" }).click();

    // Some da mensagem de vazio da seção "Saída" e a categoria aparece.
    await expect(
      page.getByText("Nenhuma categoria personalizada de saída"),
    ).not.toBeVisible();
    await expect(page.getByText("Streaming")).toBeVisible();

    // A seção "Entrada" continua vazia — a categoria foi corretamente
    // classificada apenas na seção de Saída.
    await expect(
      page.getByText("Nenhuma categoria personalizada de entrada"),
    ).toBeVisible();
  });

  test("excluir categoria personalizada → some da lista", async ({ page }) => {
    await signUp(page, "Cat E2E Excluir", uniqueEmail("e2e-cat-delete"));

    await page.goto("/app/categories");

    // Cria uma categoria de entrada para depois excluir.
    await page.getByLabel("Nome").fill("Freelance");
    await page.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Entrada" }).click();
    await page.getByRole("button", { name: "Criar categoria" }).click();

    await expect(page.getByText("Freelance")).toBeVisible();

    // Exclui: dialog de confirmação exige digitar o texto exato.
    await page
      .locator("li", { hasText: "Freelance" })
      .getByRole("button", { name: "Excluir" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Excluir categoria/ })).toBeVisible();

    await dialog.getByRole("textbox").fill("excluir permanentemente");
    await dialog.getByRole("button", { name: "Excluir" }).click();

    await expect(dialog).not.toBeVisible();
    // O item já foi excluído no servidor neste ponto (a ação já resolveu);
    // o `router.refresh()` que atualiza a lista pode legitimamente demorar
    // mais que o timeout padrão sob contenção pesada do Postgres de teste
    // compartilhado entre workers e2e em paralelo — folga maior aqui,
    // sem enfraquecer a garantia (o item precisa sumir, só damos mais
    // tempo real de rede/render para isso acontecer).
    await expect(page.getByText("Freelance")).not.toBeVisible({ timeout: 15000 });

    // A seção "Entrada" volta a mostrar o estado vazio de personalizadas.
    await expect(
      page.getByText("Nenhuma categoria personalizada de entrada"),
    ).toBeVisible();
  });
});
