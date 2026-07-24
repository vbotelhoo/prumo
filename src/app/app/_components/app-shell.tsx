"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { LogoutButton } from "@/modules/auth";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared";
import { NAV_ITEMS, isActive, type NavItem } from "../_lib/nav";
import { ThemeToggle } from "../../_components/theme-toggle";

const NAV_LINK_CLASSES =
  "flex items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

function navLinkClasses(active: boolean): string {
  return active ? `${NAV_LINK_CLASSES} bg-sidebar-accent text-sidebar-primary` : NAV_LINK_CLASSES;
}

// Lista de navegação compartilhada entre a sidebar (≥lg) e o drawer (<lg,
// T6) — mesmos itens e mesma lógica de ativo (SHELL-09: "os mesmos links,
// marca e ações da sidebar").
function NavList({
  pathname,
  onNavigate,
}: {
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegação principal" className="flex-1 px-2">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item: NavItem) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={navLinkClasses(active)}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UserSection({ userName }: { readonly userName: string }) {
  return (
    <div className="flex flex-col gap-3 border-t border-sidebar-border p-4">
      <span className="truncate text-sm text-sidebar-foreground" title={userName}>
        {userName}
      </span>
      <ThemeToggle />
      <LogoutButton />
    </div>
  );
}

// Casca de navegação da área logada (design.md, componente AppShell; spec.md
// SHELL-01..11, SHELL-15..17). Sidebar fixa ≥lg (T5) + topbar/drawer <lg
// (T6); ThemeToggle entra em T7.
export function AppShell({
  userName,
  children,
}: {
  readonly userName: string;
  readonly children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Pular para o conteúdo
      </a>

      <div className="flex min-h-full flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <Link
            href="/app"
            className="flex items-center px-4 py-4 text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            Prumo
          </Link>
          <NavList pathname={pathname} />
          <UserSection userName={userName} />
        </aside>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
              <Link
                href="/app"
                className="text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Prumo
              </Link>
              <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
                <MenuIcon aria-hidden="true" />
              </SheetTrigger>
            </header>

            {/* tabIndex={-1}: alvo do skip link (SHELL-16) precisa ser
            focável programaticamente — <main> não é focável por padrão, e
            sem isso ativar o link rola a página mas não move o foco. */}
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
              {children}
            </main>
          </div>

          <SheetContent
            side="left"
            className="flex w-64 flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetTitle className="px-4 py-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
              Prumo
            </SheetTitle>
            <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <UserSection userName={userName} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
