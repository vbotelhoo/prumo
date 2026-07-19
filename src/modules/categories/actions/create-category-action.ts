"use server";

import { headers } from "next/headers";
import type { Category } from "../domain/types";
import { createCategoryCore } from "./create-category-core";

type Result =
  | { ok: true; category: Category }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Server action for creating a category.
 * Delegates to createCategoryCore for testable logic.
 */
export async function createCategoryAction(input: unknown): Promise<Result> {
  return createCategoryCore(input, await headers());
}
