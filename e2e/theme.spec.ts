import { test, expect } from "@playwright/test";

// Tema global (design.md, "ThemeProvider + ThemeToggle"; spec.md SHELL-18,
// SHELL-20 mecanismo): o provider vive no root layout, então qualquer rota
// pública já reflete a preferência do sistema sem precisar de sessão. Este
// arquivo cobre só o mecanismo do provider (T2); o toggle e a persistência
// completos entram em T7.
test.describe("Theme — segue o sistema (SHELL-18)", () => {
  test("sem preferência salva, colorScheme escuro aplica a classe dark no primeiro paint", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkClass).toBe(true);

    const hydrationWarnings = consoleErrors.filter((text) => /hydrat/i.test(text));
    expect(hydrationWarnings).toEqual([]);

    await context.close();
  });

  test("sem preferência salva, colorScheme claro não aplica a classe dark", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();

    await page.goto("/");

    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkClass).toBe(false);

    await context.close();
  });
});
