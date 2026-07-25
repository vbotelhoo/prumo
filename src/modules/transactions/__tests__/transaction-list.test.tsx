// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { money } from "@/shared";
import { TransactionList } from "../components/TransactionList";
import type { Transaction } from "../domain/types";

// spec.md Edge Cases: "nomes de categoria/descrição longos truncam com
// reticências sem quebrar o alinhamento das colunas de valores". Verifica
// que a classe de truncamento (`truncate`, Tailwind → `text-overflow:
// ellipsis`) é aplicada às colunas de nome/descrição, e que o valor
// monetário ao lado permanece alinhado à direita (`text-right`)
// independentemente do tamanho do texto vizinho.
afterEach(() => cleanup());

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    type: "saida",
    date: "2026-07-24",
    amount: money(12345),
    description:
      "Descrição propositalmente longuíssima para forçar o truncamento com reticências em qualquer largura de coluna razoável",
    categoryId: "cat-1",
    categoryName:
      "Categoria com nome extremamente longo que também precisa truncar sem quebrar o layout da linha",
    userId: "user-1",
    createdAt: new Date("2026-07-24T00:00:00Z"),
    ...overrides,
  };
}

describe("TransactionList — truncamento de nomes longos (edge case)", () => {
  it("aplica truncate ao nome da categoria e à descrição, sem quebrar o alinhamento do valor", () => {
    const txn = makeTransaction();
    render(<TransactionList items={[txn]} onEdit={() => {}} onDelete={() => {}} />);

    const categoryName = screen.getByText(txn.categoryName);
    const description = screen.getByText(txn.description!);
    expect(categoryName.className).toContain("truncate");
    expect(description.className).toContain("truncate");

    // O valor continua alinhado à direita e tabular independentemente do
    // texto vizinho ser curto ou longuíssimo.
    const value = screen.getByText(/R\$\s*123,45/);
    expect(value.className).toContain("text-right");
    expect(value.className).toContain("tabular-nums");
  });
});
