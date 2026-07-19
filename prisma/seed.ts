import { prisma } from "@/shared/db";

const DEFAULT_CATEGORIES = [
  // saida (9)
  { name: "Alimentação", type: "saida" },
  { name: "Moradia", type: "saida" },
  { name: "Transporte", type: "saida" },
  { name: "Saúde", type: "saida" },
  { name: "Educação", type: "saida" },
  { name: "Lazer", type: "saida" },
  { name: "Vestuário", type: "saida" },
  { name: "Assinaturas e serviços", type: "saida" },
  { name: "Outros", type: "saida" },
  // entrada (4)
  { name: "Salário", type: "entrada" },
  { name: "Renda extra", type: "entrada" },
  { name: "Investimentos", type: "entrada" },
  { name: "Outros", type: "entrada" },
] as const;

export async function seed() {
  try {
    // Idempotência: skipDuplicates absorve duplicatas em re-execuções
    const result = await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        name: cat.name,
        type: cat.type,
        userId: null, // null = padrão global
      })),
      skipDuplicates: true,
    });

    console.log(`Seed: ${result.count} categorias padrão criadas/ignoradas`);
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}

// Se rodar como script (pnpm prisma db seed)
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
