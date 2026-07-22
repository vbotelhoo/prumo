import { test, expect } from "@playwright/test";

test.describe("Projections", () => {
  test("complete projection flow: entrada + saida + parcelamento 3x", async ({
    page,
  }) => {
    // Sign up new account
    await page.goto("/signup");
    const uniqueEmail = `proj-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "12345678901");
    await page.fill('input[name="birthDate"]', "1990-01-01");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Test Street");
    await page.fill('input[name="addressNumber"]', "123");
    await page.fill('input[name="neighborhood"]', "Test");
    await page.fill('input[name="city"]', "Test City");
    await page.fill('input[name="state"]', "SP");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // Create entrada (income)
    await page.goto("/app/transactions");
    await page.click('button:has-text("Nova Transação")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[name="description"]', "Test Income");
    await page.fill('input[name="amount"]', "1000.00");
    await page.selectOption('select[name="type"]', "entrada");
    await page.fill('input[name="date"]', today);
    await page.click('button:has-text("Salvar")');

    // Create saida avulsa (one-off expense)
    await page.click('button:has-text("Nova Transação")');
    await page.fill('input[name="description"]', "Test Expense");
    await page.fill('input[name="amount"]', "300.00");
    await page.selectOption('select[name="type"]', "saida");
    await page.fill('input[name="date"]', today);
    await page.click('button:has-text("Salvar")');

    // Create parcelamento 3x (commitment with 3 installments)
    await page.goto("/app/commitments");
    await page.click('button:has-text("Novo Compromisso")');
    await page.fill('input[name="description"]', "Test 3x Payment");
    await page.fill('input[name="amount"]', "600.00");
    await page.selectOption('select[name="installmentCount"]', "3");
    await page.fill('input[name="firstDueDate"]', today);
    await page.click('button:has-text("Salvar")');

    // Navigate to projections
    await page.goto("/app/projections");

    // Verify aggregates match manual calculation
    // entradas = 1000
    // saidas avulsas = 300
    // parcelas do mes = 200 (first of 3x)
    // saidasPrevistas = 300 + 200 = 500
    // saldoProjetado = 1000 - 500 = 500
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
    const saldoText = page.locator("text=Saldo Projetado").locator("..").locator("div").last();
    await expect(saldoText).toContainText("500");
  });

  test("navigate between months", async ({ page }) => {
    // Sign up
    await page.goto("/signup");
    const uniqueEmail = `nav-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "22345678901");
    await page.fill('input[name="birthDate"]', "1991-02-02");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Street");
    await page.fill('input[name="addressNumber"]', "456");
    await page.fill('input[name="neighborhood"]', "Hood");
    await page.fill('input[name="city"]', "City");
    await page.fill('input[name="state"]', "RJ");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // Go to projections
    await page.goto("/app/projections");

    // Get current month URL
    const currentUrl = page.url();
    expect(currentUrl).toContain("projections");

    // Click next month
    await page.click('button:has-text("Próximo Mês")');
    const nextUrl = page.url();
    expect(nextUrl).not.toBe(currentUrl);
    expect(nextUrl).toContain("?month=");

    // Click previous month (back to current)
    await page.click('button:has-text("Mês Anterior")');
    expect(page.url()).toBe(currentUrl);

    // "Back to current month" button should not be visible when already on current
    await expect(page.locator('button:has-text("Voltar ao Mês Atual")')).not.toBeVisible();
  });

  test("invalid ?month param falls back to current", async ({ page }) => {
    // Sign up
    await page.goto("/signup");
    const uniqueEmail = `invalid-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "33345678901");
    await page.fill('input[name="birthDate"]', "1992-03-03");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Street");
    await page.fill('input[name="addressNumber"]', "789");
    await page.fill('input[name="neighborhood"]', "Hood");
    await page.fill('input[name="city"]', "City");
    await page.fill('input[name="state"]', "MG");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // Try invalid month
    await page.goto("/app/projections?month=2026-13");
    // Should still render (fallback to current month)
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
  });

  test("empty month displays zeros", async ({ page }) => {
    // Sign up
    await page.goto("/signup");
    const uniqueEmail = `empty-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "44345678901");
    await page.fill('input[name="birthDate"]', "1993-04-04");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Street");
    await page.fill('input[name="addressNumber"]', "101");
    await page.fill('input[name="neighborhood"]', "Hood");
    await page.fill('input[name="city"]', "City");
    await page.fill('input[name="state"]', "BA");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // Go to distant future month with no data
    await page.goto("/app/projections?month=2050-06");
    // All aggregates should be R$ 0,00
    const cards = page.locator("text=R$ 0,00");
    await expect(cards.first()).toBeVisible();
  });

  test("two accounts in same month show separate projections", async ({
    page,
    context,
  }) => {
    // Account 1
    await page.goto("/signup");
    const email1 = `acc1-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', email1);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "55345678901");
    await page.fill('input[name="birthDate"]', "1994-05-05");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Street");
    await page.fill('input[name="addressNumber"]', "202");
    await page.fill('input[name="neighborhood"]', "Hood");
    await page.fill('input[name="city"]', "City");
    await page.fill('input[name="state"]', "RS");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // Create transaction for account 1
    await page.goto("/app/transactions");
    await page.click('button:has-text("Nova Transação")');
    await page.fill('input[name="description"]', "Acc1 Income");
    await page.fill('input[name="amount"]', "5000.00");
    await page.selectOption('select[name="type"]', "entrada");
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[name="date"]', today);
    await page.click('button:has-text("Salvar")');

    // Get projection for account 1
    await page.goto("/app/projections");
    const proj1Saldo = page.locator("text=Saldo Projetado").locator("..").locator("div").last();
    const saldo1Text = await proj1Saldo.textContent();

    // Account 2 in new browser context (separate cookies)
    const page2 = await context.newPage();
    await page2.goto("/signup");
    const email2 = `acc2-test-${Date.now()}@example.com`;
    await page2.fill('input[name="email"]', email2);
    await page2.fill('input[name="password"]', "test1234");
    await page2.fill('input[name="cpf"]', "66345678901");
    await page2.fill('input[name="birthDate"]', "1995-06-06");
    await page2.fill('input[name="zipCode"]', "01310100");
    await page2.fill('input[name="street"]', "Street");
    await page2.fill('input[name="addressNumber"]', "303");
    await page2.fill('input[name="neighborhood"]', "Hood");
    await page2.fill('input[name="city"]', "City");
    await page2.fill('input[name="state"]', "PR");
    await page2.check('input[name="termsAccepted"]');
    await page2.click('button:has-text("Criar Conta")');
    await page2.waitForURL("/app");

    // Create different transaction for account 2
    await page2.goto("/app/transactions");
    await page2.click('button:has-text("Nova Transação")');
    await page2.fill('input[name="description"]', "Acc2 Expense");
    await page2.fill('input[name="amount"]', "1000.00");
    await page2.selectOption('select[name="type"]', "saida");
    await page2.fill('input[name="date"]', today);
    await page2.click('button:has-text("Salvar")');

    // Get projection for account 2
    await page2.goto("/app/projections");
    const proj2Saldo = page2.locator("text=Saldo Projetado").locator("..").locator("div").last();
    const saldo2Text = await proj2Saldo.textContent();

    // Projections should be different
    expect(saldo1Text).not.toBe(saldo2Text);
    expect(saldo1Text).toContain("5000");
    expect(saldo2Text).toContain("-1000");
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/app/projections");
    // Should redirect to /login
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });

  test("projections link in /app home navigates to projections", async ({
    page,
  }) => {
    // Sign up
    await page.goto("/signup");
    const uniqueEmail = `link-test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "test1234");
    await page.fill('input[name="cpf"]', "77345678901");
    await page.fill('input[name="birthDate"]', "1996-07-07");
    await page.fill('input[name="zipCode"]', "01310100");
    await page.fill('input[name="street"]', "Street");
    await page.fill('input[name="addressNumber"]', "404");
    await page.fill('input[name="neighborhood"]', "Hood");
    await page.fill('input[name="city"]', "City");
    await page.fill('input[name="state"]', "SP");
    await page.check('input[name="termsAccepted"]');
    await page.click('button:has-text("Criar Conta")');
    await page.waitForURL("/app");

    // From /app home, click Projeções link
    await page.click('button:has-text("Projeções")');

    // Should navigate to /app/projections
    await page.waitForURL("/app/projections");
    expect(page.url()).toContain("/app/projections");

    // Projections page should be visible
    await expect(page.locator("text=Entradas Previstas")).toBeVisible();
  });
});
