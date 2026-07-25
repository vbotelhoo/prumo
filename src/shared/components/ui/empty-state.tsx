import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

// Estado vazio único para todas as listas/cards (POLISH-03): ícone opcional +
// título + descrição opcional + ação primária opcional. Cor exclusivamente
// via tokens (foreground/muted-foreground) — POLISH-04.
function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="size-10 text-muted-foreground" aria-hidden="true" /> : null}
      <p className="font-heading text-base font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
