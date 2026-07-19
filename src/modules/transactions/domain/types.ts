import type { Money } from "@/shared";

export type Transaction = {
  id: string;
  type: "entrada" | "saida";
  date: string; // YYYY-MM-DD
  amount: Money; // branded int cents
  description: string | null;
  categoryId: string;
  categoryName: string; // join no repositório; para exibição na listagem
  userId: string;
  createdAt: Date;
};

export type TransactionInput = {
  type: "entrada" | "saida";
  date: string;
  amountRaw: string; // string BRL da UI; convertida no core via parseBRL
  description?: string;
  categoryId: string;
};
