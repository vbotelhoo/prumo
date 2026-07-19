"use server";

import { headers } from "next/headers";
import { deleteCategoryCore } from "./delete-category-core";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server action for deleting a category.
 * Delegates to deleteCategoryCore for testable logic.
 */
export async function deleteCategoryAction(categoryId: string): Promise<Result> {
  return deleteCategoryCore(categoryId, await headers());
}
