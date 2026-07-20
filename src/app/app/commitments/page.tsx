import { redirect } from "next/navigation";
import { auth } from "@/modules/auth";
import { listCommitmentsByUser, CommitmentsPageClient } from "@/modules/commitments";
import { listCategoriesByUser } from "@/modules/categories";

export default async function CommitmentsPage() {
  const session = await auth.api.getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [commitments, categories] = await Promise.all([
    listCommitmentsByUser(session.user.id),
    listCategoriesByUser(session.user.id),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <CommitmentsPageClient commitments={commitments} categories={categories} />
    </div>
  );
}
