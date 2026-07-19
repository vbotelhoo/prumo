"use client";

import { Button } from "@/shared";
import type { Category, CategoryType } from "../domain/types";

type CategorySectionProps = {
  categories: Category[];
  type: CategoryType;
  onDeleteRequest: (category: Category) => void;
};

/**
 * CategorySection renders a type-specific section (entrada/saida) with
 * default and custom sub-sections.
 * Default categories (userId = null) can only be viewed.
 * Custom categories (userId ≠ null) have delete buttons.
 */
export function CategorySection({
  categories,
  type,
  onDeleteRequest,
}: CategorySectionProps) {
  const sectionTitle = type === "entrada" ? "Entradas" : "Saídas";

  // Filter categories by type
  const typedCategories = categories.filter((cat) => cat.type === type);
  const defaultCategories = typedCategories.filter((cat) => cat.userId === null);
  const customCategories = typedCategories.filter((cat) => cat.userId !== null);

  return (
    <div className="border-b pb-6 last:border-b-0">
      <h2 className="text-lg font-semibold mb-4">{sectionTitle}</h2>

      {/* Default categories sub-section */}
      {defaultCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Padrão
          </h3>
          <ul className="space-y-2">
            {defaultCategories.map((cat) => (
              <li
                key={cat.id}
                className="px-3 py-2 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Custom categories sub-section */}
      {customCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Personalizadas
          </h3>
          <ul className="space-y-2">
            {customCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between px-3 py-2 rounded bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100"
              >
                <span>{cat.name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteRequest(cat)}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {typedCategories.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhuma categoria {type === "entrada" ? "de entrada" : "de saída"} criada.
        </p>
      )}
    </div>
  );
}
