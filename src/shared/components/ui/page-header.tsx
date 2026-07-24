import * as React from "react"

import { cn } from "@/shared/lib/utils"

interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string
  description?: string
  action?: React.ReactNode
}

// Cabeçalho de página consistente entre as páginas de dados (POLISH-12):
// título Headline, descrição opcional em Body/muted, slot de ação primária
// alinhado à direita.
function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-wrap items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
