"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared";
import type { Category } from "@/modules/categories";
import { TransactionModal } from "@/modules/transactions";
import { CommitmentModal } from "@/modules/commitments";

interface QuickActionsProps {
  readonly categories: Category[];
}

type OpenModal = "transaction" | "commitment" | null;

// Atalhos de criação do dashboard (POLISH-07/08, spec.md P1 Dashboard
// AC3/AC4; decisão de design fixada: modais compostos, não deep-link).
// Um único estado `openModal` garante que os dois modais dos módulos donos
// (`TransactionModal`/`CommitmentModal`, reexportados publicamente — AD-010)
// nunca fiquem montados ao mesmo tempo. `router.refresh()` no sucesso de
// cada um faz os números do dashboard (fetch server-side em `page.tsx`)
// refletirem o dado recém-criado sem o usuário recarregar a página.
export function QuickActions({ categories }: QuickActionsProps) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  function handleSuccess() {
    setOpenModal(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        className="max-sm:min-h-11"
        onClick={() => setOpenModal("transaction")}
      >
        + Nova transação
      </Button>
      <Button
        type="button"
        variant="outline"
        className="max-sm:min-h-11"
        onClick={() => setOpenModal("commitment")}
      >
        + Novo compromisso
      </Button>

      {openModal === "transaction" ? (
        <TransactionModal
          categories={categories}
          open
          onOpenChange={(open) => {
            if (!open) setOpenModal(null);
          }}
          onSuccess={handleSuccess}
        />
      ) : null}

      {openModal === "commitment" ? (
        <CommitmentModal
          isOpen
          onClose={() => setOpenModal(null)}
          categories={categories}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
