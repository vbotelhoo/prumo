/**
 * ClosingCTA: Seção de fechamento da landing antes do footer.
 *
 * Reforço da tagline com CTA "Criar conta" para conversão final.
 * LAND-04: seção de fechamento com CTA → /signup antes do footer.
 */

import Link from "next/link";
import { buttonVariants } from "@/shared";

export function ClosingCTA() {
  return (
    <section className="border-t border-border bg-muted/50 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Coloque sua vida financeira no prumo
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Comece agora a ver seus próximos meses com clareza. Sem surpresas, sem parcelamentos
          ocultos. Tudo sob controle.
        </p>

        {/* CTA primário: Criar conta */}
        <Link href="/signup" className={buttonVariants({ variant: "default", size: "lg" })}>
          Criar conta gratuita
        </Link>
      </div>
    </section>
  );
}
