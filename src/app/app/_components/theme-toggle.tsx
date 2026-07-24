"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

const BASE_BUTTON_CLASSES =
  "rounded-sm px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_BUTTON_CLASSES = "bg-primary text-primary-foreground";
const INACTIVE_BUTTON_CLASSES = "text-muted-foreground hover:text-foreground";

const NOOP_SUBSCRIBE = () => () => {};

// `mounted` evita mismatch de hidratação: o `useTheme()` do next-themes já
// resolve o tema salvo (via localStorage) no primeiro render do cliente, que
// difere do HTML do servidor (sem acesso a localStorage) — sem essa guarda,
// o `aria-pressed` correto dispararia um warning de hidratação no console
// (quebraria SHELL-20). `useSyncExternalStore` (snapshot do servidor
// `false`, do cliente `true`) resolve isso sem o re-render extra de um
// `useEffect` com `setState`.
function useMounted(): boolean {
  return useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => true,
    () => false,
  );
}

// Toggle de tema no shell (design.md, "ThemeProvider + ThemeToggle";
// spec.md SHELL-19..21).
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div
      role="group"
      aria-label="Tema"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            className={`${BASE_BUTTON_CLASSES} ${active ? ACTIVE_BUTTON_CLASSES : INACTIVE_BUTTON_CLASSES}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
