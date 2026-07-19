import { prisma } from "@/shared/db";

const DEFAULT_CATEGORIES = [
  // saida (17)
  { name: "Alimentação", type: "saida" },
  { name: "Moradia", type: "saida" },
  { name: "Transporte", type: "saida" },
  { name: "Saúde", type: "saida" },
  { name: "Educação", type: "saida" },
  { name: "Lazer", type: "saida" },
  { name: "Vestuário", type: "saida" },
  { name: "Assinaturas e serviços", type: "saida" },
  { name: "Aluguel", type: "saida" },
  { name: "Investimentos", type: "saida" },
  { name: "Conta de água", type: "saida" },
  { name: "Conta de luz", type: "saida" },
  { name: "Financiamento", type: "saida" },
  { name: "Dívidas", type: "saida" },
  { name: "Cartão de crédito", type: "saida" },
  { name: "Boletos", type: "saida" },
  { name: "Outros", type: "saida" },
  // entrada (6)
  { name: "Salário", type: "entrada" },
  { name: "Renda extra", type: "entrada" },
  { name: "Investimentos", type: "entrada" },
  { name: "Aluguel", type: "entrada" },
  { name: "Pagamentos", type: "entrada" },
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
