/**
 * Hero: Seção de abertura da landing com proposta de valor.
 *
 * Componente server-side que renderiza:
 * - h1 com tagline "Sua vida financeira alinhada."
 * - Subtítulo com proposta de valor
 * - CTAs: "Criar conta" (primário) → /signup, "Entrar" (outline) → /login
 * - HeroPreview mockup da projeção mensal
 *
 * LAND-01, LAND-02: hero com wordmark/tagline/CTAs, preview legível nos
 * dois temas. Responsivo: desktop lado-a-lado, mobile empilhado.
 */

import Link from "next/link";
import { buttonVariants } from "@/shared";
import { HeroPreview } from "./hero-preview";

export function Hero() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-5xl">
        {/* Container: texto à esquerda, preview à direita (desktop) / empilhado (mobile) */}
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Coluna de texto: h1 + tagline + CTAs */}
          <div className="flex flex-col gap-6">
            {/* h1: Tagline da marca */}
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Sua vida financeira alinhada.
            </h1>

            {/* Subtítulo: proposta de valor */}
            <p className="text-lg leading-relaxed text-muted-foreground">
              Veja quantos dos próximos meses já estão comprometidos por parcelamentos e
              financiamentos. Decisões mais inteligentes sobre o que você pode gastar agora.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              {/* CTA primário: Criar conta */}
              <Link href="/signup" className={buttonVariants({ variant: "default" })}>
                Criar conta
              </Link>

              {/* CTA secundário: Entrar */}
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                Entrar
              </Link>
            </div>
          </div>

          {/* Coluna de preview: mockup da projeção mensal */}
          <div className="flex flex-col gap-2">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
