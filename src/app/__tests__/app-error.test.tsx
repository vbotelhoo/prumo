// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppError from "../app/error";

// spec.md POLISH-02: "WHEN um erro não tratado ocorre em qualquer página de
// /app THEN o sistema SHALL exibir o boundary compartilhado com mensagem
// pt-BR calma (sem stack trace nem jargão) e um botão 'Tentar novamente'
// que rechama a rota (reset())."
afterEach(() => cleanup());

describe("AppError (boundary compartilhado de /app)", () => {
  it("renderiza mensagem pt-BR calma, sem stack trace nem jargão técnico", () => {
    const error = Object.assign(new Error("ECONNREFUSED 127.0.0.1:5432"), {
      stack: "Error: ECONNREFUSED\n    at Connection.connect (pg-pool/index.js:42:11)",
    });
    const reset = vi.fn();

    render(<AppError error={error} reset={reset} />);

    expect(screen.getByText("Algo não saiu como esperado")).toBeDefined();
    expect(
      screen.getByText("Não conseguimos carregar esta página agora. Tente novamente em instantes.")
    ).toBeDefined();

    // Sem stack trace nem mensagem técnica crua do erro original na UI.
    const renderedText = document.body.textContent ?? "";
    expect(renderedText).not.toContain("ECONNREFUSED");
    expect(renderedText).not.toContain("at Connection.connect");
    expect(renderedText).not.toContain("pg-pool");
  });

  it("chama reset() quando 'Tentar novamente' é clicado", async () => {
    const user = userEvent.setup();
    const error = new Error("boom");
    const reset = vi.fn();

    render(<AppError error={error} reset={reset} />);

    const button = screen.getByRole("button", { name: "Tentar novamente" });
    await user.click(button);

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
