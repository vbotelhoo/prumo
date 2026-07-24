import * as React from "react"

import { cn } from "@/shared/lib/utils"
import { formatBRL, type Money } from "@/shared/money"
import { Card, CardContent } from "./card"

type StatCardTone = "neutral" | "entrada" | "saida"

interface StatCardProps extends Omit<React.ComponentProps<typeof Card>, "children"> {
  label: string
  value: Money
  tone?: StatCardTone
}

// Rótulo Label + valor tabular alinhado à direita, tom semântico correto
// (POLISH-11/13): `entrada` usa a cor de Entrada, `saida` usa a cor de
// Saída/comprometido/negativo — nunca azul (Acento Raro é só para ação
// primária/navegação/foco, não para dado financeiro).
const TONE_CLASSES: Record<StatCardTone, string> = {
  neutral: "text-foreground",
  entrada: "text-positive",
  saida: "text-negative",
}

function StatCard({ label, value, tone = "neutral", className, ...props }: StatCardProps) {
  return (
    <Card data-slot="stat-card" className={cn(className)} {...props}>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-right font-heading text-lg font-semibold tabular-nums",
            TONE_CLASSES[tone]
          )}
        >
          {formatBRL(value)}
        </span>
      </CardContent>
    </Card>
  )
}

export { StatCard }
export type { StatCardProps, StatCardTone }
