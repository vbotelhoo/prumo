// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

// Smoke test da infra de teste de componente (T1, app-polish): prova que
// `*.test.tsx` roda em jsdom dentro do project `unit` do Vitest e que
// render + interação (RTL) funcionam antes de qualquer primitivo real
// (EmptyState/Skeleton/StatCard/PageHeader) depender disso.

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      Cliques: {count}
    </button>
  );
}

describe("infra RTL + jsdom (smoke)", () => {
  it("renderiza um componente React e reage a clique do usuário", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button", { name: "Cliques: 0" });
    expect(button.textContent).toBe("Cliques: 0");

    await user.click(button);

    // getByRole lança se não encontrar — a busca em si já prova o
    // re-render pós-clique; a asserção de textContent confirma o valor.
    const updated = screen.getByRole("button", { name: "Cliques: 1" });
    expect(updated.textContent).toBe("Cliques: 1");
  });
});
