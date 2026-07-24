/**
 * ValueSection: Seção genérica de proposta de valor na landing.
 *
 * Componente reutilizável que alterna layout esquerda/direita no desktop,
 * empilha no mobile. Cada instância tem um ID de âncora para navegação.
 *
 * LAND-03, LAND-10: três seções com IDs de ancoragem, mini-visuais com dados
 * da fixture, layout alternado responsivo.
 */

import { ReactNode } from "react";

interface ValueSectionProps {
  id: string; // ID de âncora (ex: "previsibilidade")
  title: string; // Título da seção
  description: string; // Descrição/copy pt-BR
  reverse?: boolean; // Inverte layout (visual à esquerda em vez de direita)
  visual: ReactNode; // Mini-visual (componente presentacional)
}

export function ValueSection({
  id,
  title,
  description,
  reverse = false,
  visual,
}: ValueSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl px-6">
        {/* Container com grid que alterna layout: desktop lado-a-lado, mobile empilhado */}
        <div
          className={`grid gap-12 md:grid-cols-2 md:items-center ${
            reverse ? "md:grid-cols-2 md:auto-cols-fr" : ""
          }`}
          style={
            reverse
              ? { gridAutoFlow: "column dense" }
              : undefined
          }
        >
          {/* Coluna de conteúdo: título + descrição */}
          <div className={reverse ? "md:order-2" : ""}>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Coluna de visual */}
          <div className={reverse ? "md:order-1" : ""}>
            {visual}
          </div>
        </div>
      </div>
    </section>
  );
}
