// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";

import { EmptyState } from "../components/ui/empty-state";

// Vitest projects não têm `test.globals: true` (ver vitest.config.ts) —
// o auto-cleanup do RTL entre testes depende de um `afterEach` global, que
// não existe aqui. Sem isto, o DOM de um `render()` vaza para o próximo
// `it` (2 testes falharam por isso antes desta linha existir).
afterEach(() => cleanup());

// spec.md POLISH-03: "WHEN uma lista de qualquer página está vazia THEN o
// sistema SHALL renderizar o componente compartilhado de estado vazio
// (ícone + título + descrição + ação primária quando aplicável)". Cada teste
// abaixo cobre um branch de props exigido pelo AC.

describe("EmptyState", () => {
  it("renderiza o título mesmo sem description, action ou icon", () => {
    render(<EmptyState title="Nenhuma transação" />);

    expect(screen.getByText("Nenhuma transação")).toBeDefined();
    expect(screen.queryByRole("img", { hidden: true })).toBeNull();
  });

  it("renderiza a description quando fornecida", () => {
    render(
      <EmptyState
        title="Nenhuma transação"
        description="Registre sua primeira transação para começar."
      />
    );

    expect(
      screen.getByText("Registre sua primeira transação para começar.")
    ).toBeDefined();
  });

  it("omite a description quando não fornecida", () => {
    render(<EmptyState title="Nenhuma transação" />);

    expect(
      screen.queryByText("Registre sua primeira transação para começar.")
    ).toBeNull();
  });

  it("renderiza a ação primária quando fornecida e ela é acionável", async () => {
    const user = userEvent.setup();
    let clicked = false;

    render(
      <EmptyState
        title="Nenhuma transação"
        action={
          <button type="button" onClick={() => (clicked = true)}>
            Nova transação
          </button>
        }
      />
    );

    const button = screen.getByRole("button", { name: "Nova transação" });
    await user.click(button);

    expect(clicked).toBe(true);
  });

  it("omite a ação quando não fornecida", () => {
    render(<EmptyState title="Nenhuma transação" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renderiza o ícone quando fornecido, marcado decorativo (aria-hidden)", () => {
    const { container } = render(<EmptyState title="Nenhuma transação" icon={Inbox} />);

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("usa só classes de token de cor (foreground/muted-foreground), nunca paleta hardcoded", () => {
    const { container } = render(
      <EmptyState title="Nenhuma transação" description="Vazio" icon={Inbox} />
    );

    const allClassNames = Array.from(container.querySelectorAll("*"))
      .map((el) => el.className)
      .join(" ");

    expect(allClassNames).not.toMatch(/\b(text|bg|border)-(gray|zinc|slate|neutral|stone|red|green|blue)-\d+/);
  });
});
