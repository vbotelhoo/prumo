import { prisma } from "@/shared";
import type { Category, CategoryType, CreateCategoryInput } from "../domain/types";
import { CATEGORY_NOT_FOUND_ERROR } from "../domain/constants";

class AppError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Lista todas as categorias visíveis para o usuário:
 * - Todas as categorias padrão (userId = null)
 * - Todas as categorias personalizadas do usuário (userId = userId)
 * Ordenadas por nome (case-insensitive).
 */
export async function listCategoriesByUser(userId: string): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { userId: null }, // padrão
        { userId }, // personalizada do usuário
      ],
    },
  });

  // Collation padrão do Postgres ordena por byte (não pt-BR), então
  // "Conta de luz" viria antes de "Conta de água". Ordenamos em JS.
  categories.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type as CategoryType,
    userId: cat.userId,
  }));
}

/**
 * Busca uma categoria pelo ID se ela for visível para o usuário.
 * Retorna a categoria se:
 * - For uma categoria padrão (userId = null), OU
 * - For uma categoria personalizada do próprio usuário
 * Retorna null se:
 * - Não existir
 * - For uma categoria personalizada de outro usuário
 * - typeFilter for fornecido e não corresponder ao tipo da categoria
 */
export async function findCategoryForUser(
  categoryId: string,
  userId: string,
  typeFilter?: CategoryType
): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return null;
  }

  // Verifica isolamento: a categoria é padrão OU pertence ao usuário
  if (category.userId !== null && category.userId !== userId) {
    return null;
  }

  // Verifica typeFilter se fornecido
  if (typeFilter && category.type !== typeFilter) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    type: category.type as CategoryType,
    userId: category.userId,
  };
}

/**
 * Verifica se um nome de categoria está em uso para o usuário.
 * Retorna true se o nome (case-insensitive) corresponder a:
 * - Qualquer categoria padrão do mesmo tipo, OU
 * - Qualquer categoria personalizada do próprio usuário do mesmo tipo
 */
export async function isCategoryNameTaken(
  name: string,
  type: CategoryType,
  userId: string
): Promise<boolean> {
  const existing = await prisma.category.findFirst({
    where: {
      type,
      name: {
        equals: name,
        mode: "insensitive",
      },
      OR: [
        { userId: null }, // padrão
        { userId }, // do próprio usuário
      ],
    },
  });

  return !!existing;
}

/**
 * Verifica se uma categoria está em uso (tem transações ou compromissos
 * vinculados — ambos referenciam category via FK, então qualquer um dos
 * dois bloqueia a exclusão).
 */
export async function isCategoryInUse(categoryId: string): Promise<boolean> {
  const [transactionCount, commitmentCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId } }),
    prisma.commitment.count({ where: { categoryId } }),
  ]);

  return transactionCount > 0 || commitmentCount > 0;
}

/**
 * Cria uma nova categoria personalizada vinculada ao usuário.
 */
export async function createCategory(
  input: CreateCategoryInput & { userId: string }
): Promise<Category> {
  const category = await prisma.category.create({
    data: {
      name: input.name,
      type: input.type,
      userId: input.userId,
    },
  });

  return {
    id: category.id,
    name: category.name,
    type: category.type as CategoryType,
    userId: category.userId,
  };
}

/**
 * Deleta uma categoria personalizada do usuário.
 * Filtra por id E userId para garantir isolamento (AD-012).
 * Lança AppError se: não encontrada, padrão (userId=null), ou de outro usuário.
 */
export async function deleteCategory(
  categoryId: string,
  userId: string
): Promise<void> {
  const deleted = await prisma.category.deleteMany({
    where: {
      id: categoryId,
      userId, // Garante que só pode deletar categorias do próprio usuário
    },
  });

  if (deleted.count === 0) {
    throw new AppError(CATEGORY_NOT_FOUND_ERROR);
  }
}
