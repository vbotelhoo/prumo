// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuickActions } from "../_components/QuickActions";

// Testa AC3 (parcial — os botões de atalho existem; a remoção dos 4 botões
// emoji antigos é escopo do T9) e AC4 (parcial — abrir o modal certo e
// disparar `router.refresh()` no sucesso; o fluxo real com dado persistido
// é e2e no T9). Os módulos donos são mockados (`vi.mock`) para isolar
// `QuickActions` do formulário real de cada modal — a regra de composição
// sob teste é "um estado, nunca os dois modais montados juntos".
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/modules/transactions", () => ({
  TransactionModal: (props: { open: boolean; onSuccess: () => void }) =>
    props.open ? (
      <div role="dialog" aria-label="transaction-modal">
        <h2>Nova transação</h2>
        <button type="button" onClick={props.onSuccess}>
          Salvar transação
        </button>
      </div>
    ) : null,
}));

vi.mock("@/modules/commitments", () => ({
  CommitmentModal: (props: { isOpen: boolean; onSuccess?: () => void }) =>
    props.isOpen ? (
      <div role="dialog" aria-label="commitment-modal">
        <h2>Novo compromisso</h2>
        <button type="button" onClick={props.onSuccess}>
          Salvar compromisso
        </button>
      </div>
    ) : null,
}));

afterEach(() => {
  cleanup();
  refreshMock.mockClear();
});

describe("QuickActions", () => {
  it("nenhum modal está montado inicialmente", () => {
    render(<QuickActions categories={[]} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it('clicar em "Nova transação" abre só o modal de transação', async () => {
    const user = userEvent.setup();
    render(<QuickActions categories={[]} />);

    await user.click(screen.getByRole("button", { name: /Nova transação/ }));

    expect(screen.getByRole("dialog", { name: "transaction-modal" })).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "commitment-modal" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it('clicar em "Novo compromisso" abre só o modal de compromisso', async () => {
    const user = userEvent.setup();
    render(<QuickActions categories={[]} />);

    await user.click(screen.getByRole("button", { name: /Novo compromisso/ }));

    expect(screen.getByRole("dialog", { name: "commitment-modal" })).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "transaction-modal" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("trocar de atalho troca o modal aberto sem nunca montar os dois juntos", async () => {
    const user = userEvent.setup();
    render(<QuickActions categories={[]} />);

    await user.click(screen.getByRole("button", { name: /Nova transação/ }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /Novo compromisso/ }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "commitment-modal" })).toBeDefined();
  });

  it("sucesso no modal de transação fecha o modal e chama router.refresh", async () => {
    const user = userEvent.setup();
    render(<QuickActions categories={[]} />);

    await user.click(screen.getByRole("button", { name: /Nova transação/ }));
    await user.click(screen.getByRole("button", { name: "Salvar transação" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("sucesso no modal de compromisso fecha o modal e chama router.refresh", async () => {
    const user = userEvent.setup();
    render(<QuickActions categories={[]} />);

    await user.click(screen.getByRole("button", { name: /Novo compromisso/ }));
    await user.click(screen.getByRole("button", { name: "Salvar compromisso" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
