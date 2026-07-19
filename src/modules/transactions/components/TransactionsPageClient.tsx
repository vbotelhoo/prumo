"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/modules/categories";
import type { Transaction } from "../domain/types";
import { TransactionModal } from "./TransactionModal";
import { TransactionList } from "./TransactionList";
import { TransactionsEmptyState } from "./TransactionsEmptyState";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";
import { Pagination } from "./Pagination";
import { Button } from "@/shared";

type TransactionsPageClientProps = {
  items: Transaction[];
  total: number;
  page: number;
  totalPages: number;
  categories: Category[];
};

/**
 * TransactionsPageClient is the coordinating client component for /app/transactions.
 * It manages the modal and dialog states, and composes all transaction-related components.
 */
export function TransactionsPageClient({
  items,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  total,
  page,
  totalPages,
  categories,
}: TransactionsPageClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleCreateClick = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleEditClick = (txn: Transaction) => {
    setEditingTransaction(txn);
    setModalOpen(true);
  };

  const handleDeleteClick = (txn: Transaction) => {
    setDeletingTransaction(txn);
    setDeleteDialogOpen(true);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditingTransaction(null);
    router.refresh();
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingTransaction(null);
    }
  };

  const handleDeleted = () => {
    setDeleteDialogOpen(false);
    setDeletingTransaction(null);
    router.refresh();
  };

  return (
    <div className="flex-1 px-6 py-8">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transações</h1>
          <Button onClick={handleCreateClick}>+ Nova transação</Button>
        </div>

        {items.length === 0 ? (
          <TransactionsEmptyState onAddNew={handleCreateClick} />
        ) : (
          <>
            <div className="space-y-4">
              <TransactionList
                items={items}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </div>
            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} />}
          </>
        )}

        <TransactionModal
          key={editingTransaction?.id ?? "create"}
          categories={categories}
          transaction={editingTransaction ?? undefined}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleModalSuccess}
        />

        <DeleteTransactionDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogOpenChange}
          transaction={deletingTransaction}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  );
}
