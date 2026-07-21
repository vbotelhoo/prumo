"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared";
import type { Commitment } from "../domain/types";
import type { Category } from "@/modules/categories";
import { CommitmentModal } from "./CommitmentModal";
import { CommitmentList } from "./CommitmentList";
import { DeleteCommitmentDialog } from "./DeleteCommitmentDialog";
import { setInstallmentStatusAction } from "../actions/set-installment-status-action";

interface CommitmentsPageClientProps {
  commitments: Commitment[];
  categories: Category[];
}

export function CommitmentsPageClient({
  commitments: initialCommitments,
  categories,
}: CommitmentsPageClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [isDeletingCommitment, setIsDeletingCommitment] = useState<Commitment | null>(null);
  const [, startTransition] = useTransition();

  const salesdaCategories = categories.filter((c) => c.type === "saida");

  const handleEdit = (commitment: Commitment) => {
    setEditingCommitment(commitment);
    setIsModalOpen(true);
  };

  const handleDelete = (commitment: Commitment) => {
    setIsDeletingCommitment(commitment);
  };

  const handleToggleInstallment = (installmentId: string, status: "prevista" | "paga") => {
    startTransition(async () => {
      await setInstallmentStatusAction({
        installmentId,
        status,
      });
      router.refresh();
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCommitment(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    router.refresh();
  };

  const handleDeleteClose = () => {
    setIsDeletingCommitment(null);
  };

  const handleDeleteSuccess = () => {
    handleDeleteClose();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Compromissos</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ Novo Compromisso</Button>
      </div>

      <CommitmentList
        commitments={initialCommitments}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleInstallment={handleToggleInstallment}
      />

      <CommitmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingCommitment={editingCommitment || undefined}
        categories={salesdaCategories}
        onSuccess={handleModalSuccess}
      />

      <DeleteCommitmentDialog
        isOpen={Boolean(isDeletingCommitment)}
        onClose={handleDeleteClose}
        commitment={isDeletingCommitment || undefined}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
