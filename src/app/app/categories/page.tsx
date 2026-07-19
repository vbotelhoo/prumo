import { headers } from "next/headers";

import { auth } from "@/modules/auth";
import { CategoriesPageClient, listCategoriesByUser } from "@/modules/categories";

/**
 * /app/categories page — server component that fetches categories
 * and renders the coordinating client component.
 */
export default async function CategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized: user not found in session");
  }

  const categories = await listCategoriesByUser(userId);

  return (
    <div className="flex-1 px-6 py-8">
      <div className="max-w-4xl">
        <CategoriesPageClient categories={categories} />
      </div>
    </div>
  );
}
