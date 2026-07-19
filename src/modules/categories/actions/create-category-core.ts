import { auth } from "@/modules/auth";
import type { Category } from "../domain/types";
import { createCategoryInputSchema } from "../domain/schemas";
import {
  createCategory as createCategoryRepo,
  isCategoryNameTaken,
} from "../data/categories-repository";
import { CATEGORY_NAME_IN_USE_ERROR } from "../domain/constants";
import type { Headers } from "next/headers";

type Result =
  | { ok: true; category: Category }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Core logic for creating a category.
 * Testable without "use server" directive.
 */
export async function createCategoryCore(
  input: unknown,
  headers: Headers
): Promise<Result> {
  // 1. Get session and extract userId
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Validate input with Zod
  const parseResult = createCategoryInputSchema.safeParse(input);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    parseResult.error.errors.forEach((error) => {
      const path = error.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(error.message);
    });
    return { ok: false, error: "Validação falhou", fieldErrors };
  }

  const { name, type } = parseResult.data;

  // 3. Check if name is already taken
  const nameTaken = await isCategoryNameTaken(name, type, session.user.id);
  if (nameTaken) {
    return {
      ok: false,
      error: CATEGORY_NAME_IN_USE_ERROR,
      fieldErrors: { name: [CATEGORY_NAME_IN_USE_ERROR] },
    };
  }

  // 4. Create the category
  const category = await createCategoryRepo({
    name,
    type,
    userId: session.user.id,
  });

  return { ok: true, category };
}
