"use client";

import { ThemeProvider } from "next-themes";

// Provider global de tema (design.md, componente "ThemeProvider + ThemeToggle";
// spec.md SHELL-18..20). `attribute="class"` aplica `.dark` no `<html>` (a
// variante `@custom-variant dark (&:is(.dark *))` de globals.css depende
// disso); `next-themes` injeta um script inline antes da hidratação que já
// aplica a classe correta no primeiro paint — sem isso há flash (SHELL-20).
export function Providers({ children }: { readonly children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
