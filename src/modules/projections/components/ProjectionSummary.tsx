import { StatCard } from "@/shared";
import type { MonthlyProjection } from "../domain/types";

/**
 * ProjectionSummary: os 4 stats da página de projeções sobre o primitivo
 * `StatCard` (POLISH-15) — mesmo padrão de card/tipografia das demais
 * páginas (contrato `{projection}` preservado; o dashboard usa `StatCard`
 * diretamente e não depende deste componente).
 *
 * Tons: Entradas = `entrada` (verde), Saídas e Total Comprometido = `saida`
 * (vermelho — DESIGN.md define comprometido como semântica de Saída, nunca
 * azul; corrige o `text-blue-600` anterior). Saldo Projetado segue a mesma
 * regra do `DashboardHero`: negativo usa `saida`, não-negativo fica neutro
 * (cor primária) — só o número muda de cor, nunca o card (Semântica Só em
 * Número).
 */
export function ProjectionSummary({ projection }: { projection: MonthlyProjection }) {
  const isSaldoNegativo = projection.saldoProjetado < 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Entradas Previstas" value={projection.entradasPrevistas} tone="entrada" />
      <StatCard label="Saídas Previstas" value={projection.saidasPrevistas} tone="saida" />
      <StatCard
        label="Saldo Projetado"
        value={projection.saldoProjetado}
        tone={isSaldoNegativo ? "saida" : "neutral"}
      />
      <StatCard label="Total Comprometido" value={projection.totalComprometido} tone="saida" />
    </div>
  );
}
