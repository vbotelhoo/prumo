import Link from "next/link";

/**
 * Footer público — todas as páginas públicas (/, /login, /signup, /terms).
 * Wordmark + tagline, link /terms, copyright. Landmark contentinfo para
 * acessibilidade (LAND-12).
 */
export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background mt-auto py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Brand + Tagline */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-foreground">Prumo</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Sua vida financeira alinhada.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1 transition-colors"
            >
              Termos de uso
            </Link>
          </nav>

          {/* Copyright */}
          <div className="border-t border-border pt-6 sm:pt-8">
            <p className="text-xs text-muted-foreground">
              © {currentYear} Prumo. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
