import { Hero } from "./_components/hero";
import { ValueSection } from "./_components/value-section";
import {
  PrevisibilidadeVisual,
  ParcelasVisual,
  ProjecaoVisual,
} from "./_components/value-section-visuals";

// Landing page (SETUP-03): nenhum import de banco/auth — garante o
// edge case "home renderiza mesmo com o banco fora do ar" (spec.md, Edge
// Cases). LAND-01/02/03: hero, três seções de valor, fechamento e CTAs.
export default function Home() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <Hero />

      {/* LAND-03: Três seções de proposta de valor alternadas */}

      {/* Seção 1: Previsibilidade */}
      <ValueSection
        id="previsibilidade"
        title="Sabe exatamente quanto você pode gastar"
        description='Cada parcelamento futuro é visível no mês que vai comprometer seu orçamento. Sem surpresas. Sem "não lembrava que tinha essa prestação".'
        visual={<PrevisibilidadeVisual />}
      />

      {/* Seção 2: Parcelas e Financiamentos */}
      <ValueSection
        id="parcelas"
        title="Parcelamentos e financiamentos sob controle"
        description="Centralize compras parceladas, empréstimos pessoais e tudo o que compromete seus próximos meses. Veja cada uma delas, o valor, quantas faltam."
        reverse
        visual={<ParcelasVisual />}
      />

      {/* Seção 3: Projeção Mensal */}
      <ValueSection
        id="projecao"
        title="Suas próximas semanas em um gráfico"
        description="Projeção mensal mostra o saldo de cada mês com base em receitas, despesas avulsas e parcelamentos. Planeje com confiança."
        visual={<ProjecaoVisual />}
      />
    </main>
  );
}
