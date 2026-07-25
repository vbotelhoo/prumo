"use client";

import { Button, EmptyState } from "@/shared";
import type { Category, CategoryType } from "../domain/types";

type CategorySectionProps = {
  categories: Category[];
  type: CategoryType;
  onDeleteRequest: (category: Category) => void;
};

/**
 * CategorySection renders a type-specific section (entrada/saida) with
 * default and custom sub-sections. Default categories (userId = null) can
 * only be viewed. Custom categories (userId ≠ null) have delete buttons.
 * Ambas as listas usam o mesmo tratamento neutro (`bg-muted`) — nada de
 * azul decorativo em fundo (Acento Raro é reservado a ação primária,
 * navegação ativa e foco). Seção "Personalizadas" vazia usa o `EmptyState`
 * compartilhado (POLISH-03), compacto para caber inline na seção.
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
    <div className="border-b border-border pb-6 last:border-b-0">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{sectionTitle}</h2>

      {/* Default categories sub-section */}
      {defaultCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Padrão</h3>
          <ul className="space-y-2">
            {defaultCategories.map((cat) => (
              <li
                key={cat.id}
                className="truncate rounded bg-muted px-3 py-2 text-foreground"
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Custom categories sub-section */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Personalizadas</h3>
        {customCategories.length > 0 ? (
          <ul className="space-y-2">
            {customCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-2 rounded bg-muted px-3 py-2 text-foreground"
              >
                <span className="min-w-0 truncate">{cat.name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="max-sm:min-h-11"
                  onClick={() => onDeleteRequest(cat)}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={`Nenhuma categoria personalizada de ${type === "entrada" ? "entrada" : "saída"}`}
            description="Crie uma categoria personalizada acima para organizar melhor seus lançamentos."
            className="items-start px-0 py-4 text-left"
          />
        )}
      </div>
    </div>
  );
}
