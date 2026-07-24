import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Contraste AA dos tokens de tema (spec.md SHELL-13/14): globals.css é a
// única fonte de cor do shell; todo par texto/fundo usado pelo shell precisa
// cumprir WCAG AA nos dois temas. Este teste lê o CSS real (não uma cópia) e
// converte oklch -> luminância relativa (fórmulas de Björn Ottosson para
// Oklab/sRGB + fórmula de luminância relativa do WCAG) para computar a razão
// de contraste — pega qualquer regressão de valor de token automaticamente.

const CSS_PATH = path.resolve(__dirname, "../globals.css");
const css = fs.readFileSync(CSS_PATH, "utf-8");

function extractBlock(selectorRegex: RegExp): Record<string, string> {
  const match = selectorRegex.exec(css);
  if (!match) {
    throw new Error(`Bloco não encontrado em globals.css: ${selectorRegex}`);
  }
  const body = match[1]!;
  const tokens: Record<string, string> = {};
  const declRegex = /--([a-z0-9-]+):\s*([^;]+);/gi;
  let decl: RegExpExecArray | null;
  while ((decl = declRegex.exec(body)) !== null) {
    tokens[decl[1]!] = decl[2]!.trim();
  }
  return tokens;
}

const lightTokens = extractBlock(/:root\s*{([^}]*)}/);
const darkTokens = extractBlock(/\.dark\s*{([^}]*)}/);

function oklchToLinearSrgb(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return [r, g, bl];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  // WCAG relative luminance — a matriz Oklab->linear-sRGB acima já entrega
  // componentes lineares, então aplica-se o peso direto (sem re-linearizar).
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

function parseOklch(value: string): [number, number, number] {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value);
  if (!m) {
    throw new Error(`Token de cor não é oklch(L C H) simples: "${value}"`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function contrastRatio(tokens: Record<string, string>, fgName: string, bgName: string): number {
  const fg = tokens[fgName];
  const bg = tokens[bgName];
  if (!fg || !bg) {
    throw new Error(`Token ausente: --${fgName} ou --${bgName}`);
  }
  const lumFg = relativeLuminance(oklchToLinearSrgb(...parseOklch(fg)));
  const lumBg = relativeLuminance(oklchToLinearSrgb(...parseOklch(bg)));
  const lighter = Math.max(lumFg, lumBg);
  const darker = Math.min(lumFg, lumBg);
  return (lighter + 0.05) / (darker + 0.05);
}

const TEXT_MIN = 4.5;
const UI_MIN = 3.0;

// Pares texto/fundo que o shell renderiza (sidebar, drawer, topbar, toggle de
// tema, botão de logout) — ver design.md Components. `ui: true` marca pares
// de affordance (foco/estado interativo, não texto de leitura), com o piso
// de 3:1 do SHELL-14 em vez de 4.5:1.
const PAIRS: { label: string; fg: string; bg: string; ui?: boolean }[] = [
  { label: "texto de página sobre o fundo", fg: "foreground", bg: "background" },
  { label: "texto sobre card", fg: "card-foreground", bg: "card" },
  { label: "texto sobre popover (menu do toggle de tema)", fg: "popover-foreground", bg: "popover" },
  { label: "texto sobre botão primário", fg: "primary-foreground", bg: "primary" },
  { label: "texto sobre superfície secundária", fg: "secondary-foreground", bg: "secondary" },
  { label: "texto secundário (nome do usuário) sobre o fundo", fg: "muted-foreground", bg: "background" },
  { label: "texto secundário sobre card", fg: "muted-foreground", bg: "card" },
  { label: "texto sobre superfície de hover (accent)", fg: "accent-foreground", bg: "accent" },
  { label: "texto normal sobre hover ghost (bg-muted)", fg: "foreground", bg: "muted" },
  { label: "texto sobre a sidebar", fg: "sidebar-foreground", bg: "sidebar" },
  { label: "texto sobre hover/ativo da sidebar", fg: "sidebar-accent-foreground", bg: "sidebar-accent" },
  { label: "item de nav ativo (acento como texto) sobre o fundo", fg: "primary", bg: "background" },
  { label: "item de nav ativo (acento como texto) sobre a sidebar", fg: "sidebar-primary", bg: "sidebar" },
  { label: "anel de foco sobre o fundo (visibilidade do foco, SHELL-15)", fg: "ring", bg: "background", ui: true },
  { label: "anel de foco sobre a sidebar", fg: "sidebar-ring", bg: "sidebar", ui: true },
  { label: "anel de foco sobre card (ex.: dentro do drawer)", fg: "ring", bg: "card", ui: true },

  // Pares novos introduzidos pelas Fases 1–3 do app-polish (roadmap item 9):
  // `--positive`/`--negative` (DashboardHero, StatCard, TransactionList,
  // CommitmentList — Semântica Só em Número, AD-017) e `muted-foreground`
  // sobre `muted` (badge "Prevista" de parcela em CommitmentList) não tinham
  // par no teste de contraste ainda.
  { label: "valor positivo (Entrada) sobre o fundo da página", fg: "positive", bg: "background" },
  { label: "valor negativo (Saída/comprometido) sobre o fundo da página", fg: "negative", bg: "background" },
  { label: "valor positivo (Entrada) sobre card (StatCard)", fg: "positive", bg: "card" },
  { label: "valor negativo (Saída/comprometido) sobre card (StatCard/CommitmentList)", fg: "negative", bg: "card" },
  { label: "texto secundário sobre badge neutro (ex.: parcela 'Prevista')", fg: "muted-foreground", bg: "muted" },
];

describe.each([
  ["claro", lightTokens],
  ["escuro", darkTokens],
] as const)("tema %s — contraste AA (SHELL-14)", (_themeName, tokens) => {
  it.each(PAIRS)("$label cumpre o piso WCAG AA", ({ fg, bg, ui }) => {
    const ratio = contrastRatio(tokens, fg, bg);
    const min = ui ? UI_MIN : TEXT_MIN;
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe("globals.css — única fonte de cor (SHELL-13)", () => {
  it("define os mesmos tokens de cor em :root e .dark (nenhum tema incompleto)", () => {
    // `--radius` só existe em `:root` (não é cor, não é redefinido por tema).
    const colorKeys = (tokens: Record<string, string>) =>
      Object.keys(tokens)
        .filter((key) => key !== "radius")
        .sort();
    expect(colorKeys(darkTokens)).toEqual(colorKeys(lightTokens));
  });
});

// spec.md POLISH-04/AD-018: paleta categórica do gráfico como tokens
// `--chart-1..8` em globals.css (CategorySpendingChart consome só
// `var(--chart-N)`, nunca hex hardcoded) — presença dos 8 nos 2 temas.
describe("globals.css — tokens --chart-1..8 (AD-018)", () => {
  const CHART_TOKEN_NAMES = Array.from({ length: 8 }, (_, i) => `chart-${i + 1}`);

  it.each([
    ["claro", lightTokens],
    ["escuro", darkTokens],
  ] as const)("tema %s define os 8 tokens --chart-1..8", (_themeName, tokens) => {
    for (const name of CHART_TOKEN_NAMES) {
      expect(tokens[name], `token --${name} ausente`).toBeDefined();
      expect(() => parseOklch(tokens[name]!)).not.toThrow();
    }
  });
});
