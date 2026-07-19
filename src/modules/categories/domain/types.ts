export type CategoryType = "entrada" | "saida";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  userId: string | null; // null = padrão global; non-null = personalizada
};

export type CreateCategoryInput = {
  name: string; // após trim, 1–40 chars
  type: CategoryType;
};
