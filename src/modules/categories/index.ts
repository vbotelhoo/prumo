// API pública do módulo `categories`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste módulo. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).

// Domain: tipos e schemas
export type { Category, CategoryType, CreateCategoryInput } from "./domain/types";
export { categoryTypeSchema } from "./domain/schemas";

// Data layer: repository queries
export {
  listCategoriesByUser,
  findCategoryForUser,
} from "./data/categories-repository";

// Actions: mutations
export { createCategoryAction } from "./actions/create-category-action";
export { deleteCategoryAction } from "./actions/delete-category-action";
