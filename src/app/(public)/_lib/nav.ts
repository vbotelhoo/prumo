export interface LandingNavSection {
  id: string;
  label: string;
  href: string;
}

/**
 * Seções de valor da landing (spec.md LAND-03) com IDs de âncora para scroll.
 * Consumida por PublicHeader (renderização de âncoras apenas em `/`)
 * e sections da landing (id para navegação intra-página).
 */
export const LANDING_NAV_SECTIONS: LandingNavSection[] = [
  { id: "previsibilidade", label: "Previsibilidade", href: "/#previsibilidade" },
  { id: "parcelas", label: "Parcelas e Financiamentos", href: "/#parcelas" },
  { id: "projecao", label: "Projeção Mensal", href: "/#projecao" },
];
