import { auth } from "@/modules/auth";
import {
  deleteCategory as deleteCategoryRepo,
  isCategoryInUse,
} from "../data/categories-repository";
import {
  CATEGORY_IN_USE_ERROR,
  CATEGORY_NOT_FOUND_ERROR,
} from "../domain/constants";
import type { Headers } from "next/headers";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Core logic for deleting a category.
 * Testable without "use server" directive.
 *
 * Flow:
 * 1. Get session and extract userId
 * 2. Check if category is in use (has transactions)
 * 3. If in use, return error
 * 4. Try to delete the category
 * 5. Handle AppError from repository (not found, padrão, or another user)
 * 6. Handle FK Restrict errors (race condition: transação criada entre check e delete)
 */
export async function deleteCategoryCore(
  categoryId: string,
  headers: Headers
): Promise<Result> {
  // 1. Get session and extract userId
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Check if category is in use
  const inUse = await isCategoryInUse(categoryId);
  if (inUse) {
    return { ok: false, error: CATEGORY_IN_USE_ERROR };
  }

  // 3. Try to delete
  try {
    await deleteCategoryRepo(categoryId, session.user.id);
    return { ok: true };
  } catch (error) {
    // Handle AppError from repository
    if (error instanceof Error) {
      // FK Restrict or other database errors: category became in-use after check
      if (
        error.message.includes("Foreign key constraint failed") ||
        error.message.includes("CATEGORY_NOT_FOUND")
      ) {
        // Check again to provide accurate error
        const stillInUse = await isCategoryInUse(categoryId);
        if (stillInUse) {
          return { ok: false, error: CATEGORY_IN_USE_ERROR };
        }
        return { ok: false, error: CATEGORY_NOT_FOUND_ERROR };
      }
      // If message matches our AppError
      if (error.message === CATEGORY_NOT_FOUND_ERROR) {
        return { ok: false, error: CATEGORY_NOT_FOUND_ERROR };
      }
    }
    return { ok: false, error: "Erro ao excluir categoria" };
  }
}
