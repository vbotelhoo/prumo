import { expect, test } from "@playwright/test";

// Smoke e2e da home (spec.md, story "Testes" AC-4; SETUP-10): único fluxo de
// usuário do setup. Também serve como verificação e2e do placeholder de T7
// (merge forward — a infra Playwright nasce nesta task).
// T5: agora / exibe header com wordmark "Prumo" — usar role=banner + first()
// para evitar strict-mode violation com múltiplas instâncias do texto.
test("home responde 200 e exibe o placeholder do Prumo", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("banner").getByRole("link", { name: "Prumo" }).first()).toBeVisible();
});
