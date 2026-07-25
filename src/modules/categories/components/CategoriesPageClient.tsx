"use client";

import { useState } from "react";
import { PageHeader } from "@/shared";
import type { Category } from "../domain/types";
import { CategorySection } from "./CategorySection";
import { CreateCategoryForm } from "./CreateCategoryForm";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

type CategoriesPageClientProps = {
  categories: Category[];
};

/**
 * CategoriesPageClient is the coordinating client component for /app/categories.
 * It manages the delete dialog state and composes CategorySection, CreateCategoryForm,
 * and DeleteCategoryDialog.
 */
export function CategoriesPageClient({ categories }: CategoriesPageClientProps) {
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [isInUse, setIsInUse] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteRequest = (category: Category) => {
    setPendingDelete(category);
    setIsInUse(false); // Reset until we know
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setPendingDelete(null);
      setIsInUse(false);
    }
  };

  const handleDeleted = () => {
    setPendingDelete(null);
    setIsInUse(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categorias"
        description="Categorias padrão e personalizadas usadas em transações e compromissos."
      />

      <CreateCategoryForm />

      <div className="space-y-6">
        <CategorySection
          categories={categories}
          type="entrada"
          onDeleteRequest={handleDeleteRequest}
        />
        <CategorySection
          categories={categories}
          type="saida"
          onDeleteRequest={handleDeleteRequest}
        />
      </div>

      <DeleteCategoryDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        category={pendingDelete}
        isInUse={isInUse}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
