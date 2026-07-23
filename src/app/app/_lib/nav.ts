export interface NavItem {
  label: string;
  href: string;
  /** Match exato de rota (só `/app`); as demais seções casam por prefixo. */
  exact: boolean;
}

/**
 * Itens da navegação global do shell (spec.md SHELL-01), nesta ordem exata.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", exact: true },
  { label: "Transações", href: "/app/transactions", exact: false },
  { label: "Compromissos", href: "/app/commitments", exact: false },
  { label: "Categorias", href: "/app/categories", exact: false },
  { label: "Projeções", href: "/app/projections", exact: false },
];

/**
 * Item ativo por rota atual (spec.md SHELL-03): match exato para `/app`,
 * match por prefixo (com fronteira de segmento) para as demais seções — uma
 * sub-rota futura como `/app/commitments/123` mantém "Compromissos" ativo,
 * mas `/app/commitments-extra` (rota diferente, mesmo prefixo textual) não.
 */
export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
