"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDING_NAV_SECTIONS } from "../_lib/nav";
import { ThemeToggle } from "@/app/_components/theme-toggle";

interface PublicHeaderProps {
  readonly hasSession: boolean;
}

export function PublicHeader({ hasSession }: PublicHeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {/* Main header row */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
        {/* Wordmark */}
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Prumo
        </Link>

        {/* Anchors — only on landing, hidden on mobile */}
        {isLanding && (
          <nav
            className="hidden md:flex md:flex-1 md:justify-center gap-4"
            aria-label="Seções da landing"
          >
            {LANDING_NAV_SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1 transition-colors"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        )}

        {/* CTAs + Theme Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {hasSession ? (
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded px-2 h-7 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap"
            >
              Ir para o app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center justify-center rounded px-2 h-7 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded px-2 h-7 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap"
              >
                Criar conta
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
