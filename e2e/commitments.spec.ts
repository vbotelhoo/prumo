import { test, expect } from "@playwright/test";

test("should create installment, verify rounding, and mark as paid", async ({ page }) => {
  // 1. Sign up with a test account
  await page.goto("/signup");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="birthDate"]', "1990-01-01");
  await page.fill('input[name="zipCode"]', "12345000");
  await page.fill('input[name="street"]', "Rua Test");
  await page.fill('input[name="addressNumber"]', "123");
  await page.fill('input[name="neighborhood"]', "Bairro");
  await page.fill('input[name="city"]', "Cidade");
  await page.fill('input[name="state"]', "SP");
  await page.fill('input[name="cpf"]', "12345678901");
  await page.check('input[type="checkbox"]'); // Terms acceptance

  await page.click('button:has-text("Criar conta")');
  await page.waitForNavigation();

  // 2. Create a default category (expense)
  await page.goto("/app/categories");
  await page.click('button:has-text("Nova Categoria")');

  await page.fill('input[name="name"]', "Eletrônicos");
  await page.selectOption('select[name="type"]', "saida");

  await page.click('button:has-text("Criar")');
  await page.waitForTimeout(500); // Wait for modal to close

  // 3. Navigate to commitments
  await page.goto("/app/commitments");

  // 4. Create a commitment (R$ 100,00 in 3x → 33.34 + 33.33 + 33.33)
  await page.click('button:has-text("Novo Compromisso")');

  // Select installment_payment mode (default)
  await expect(page.locator("input[name='mode'][value='installment_payment']")).toBeChecked();

  // Fill form
  await page.fill('input[name="description"]', "Notebook");
  await page.selectOption('select[name="categoryId"]', { label: "Eletrônicos" });
  await page.fill('input[name="total"]', "100,00");
  await page.fill('input[name="installmentCount"]', "3");

  // Set first due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split("T")[0];
  await page.fill('input[name="firstDueDate"]', dateString);

  await page.click('button:has-text("Criar")');
  await page.waitForNavigation();

  // 5. Verify commitment is listed
  await expect(page.locator('text="Notebook"')).toBeVisible();
  await expect(page.locator("text=Eletrônicos")).toBeVisible();

  // 6. Verify progress metrics
  await expect(page.locator("text=0/3")).toBeVisible(); // 0 pagas / 3 total
  await expect(page.locator("text=R$ 0,00")).toBeVisible(); // 0 pago
  await expect(page.locator("text=R$ 100,00")).toBeVisible(); // saldo

  // 7. Expand commitment to see installments
  await page.click('h3:has-text("Notebook")'); // Click on commitment card header

  await page.waitForTimeout(300);

  // 8. Verify the 3 installments with correct rounding
  // 1st installment: 33,34
  await expect(page.locator("text=R$ 33,34")).toBeVisible();
  // 2nd and 3rd installments: 33,33 each
  const installments33_33 = page.locator("text=R$ 33,33");
  const count33_33 = await installments33_33.count();
  expect(count33_33).toBeGreaterThanOrEqual(2); // At least 2 occurrences

  // 9. Verify all are prevista (predicted)
  await expect(page.locator("text=Prevista")).toHaveCount(3, { timeout: 5000 });

  // 10. Click on first installment to mark as paid
  const firstInstallmentRow = page.locator("[class*='bg-gray-50']").first(); // First installment row
  await firstInstallmentRow.click();

  await page.waitForTimeout(300);

  // 11. Verify the installment is now marked as paga
  await expect(page.locator("text=✓ Paga").first()).toBeVisible();

  // 12. Verify progress updated (1/3 pagas, R$ 33.34 pago, R$ 66.66 saldo)
  await expect(page.locator("text=1/3")).toBeVisible();
  await expect(page.locator("text=R$ 33,34")).toBeVisible(); // Pago amount
  await expect(page.locator("text=R$ 66,66")).toBeVisible(); // Remaining saldo
});
