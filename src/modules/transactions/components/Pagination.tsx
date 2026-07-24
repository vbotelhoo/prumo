import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
};

const LINK_CLASS =
  "px-3 py-2 rounded border border-border text-foreground hover:bg-muted";
const DISABLED_CLASS =
  "px-3 py-2 rounded border border-border text-muted-foreground cursor-not-allowed";

/**
 * Pagination component for numbered page navigation.
 * Renders [← Anterior] [1] [2] … [N] [Próxima →] using Link for server-side routing.
 * Current page is highlighted. Navigation buttons are disabled on boundaries.
 * Cor só via tokens (POLISH-04); página atual usa o acento de marca (Azul
 * Prumo), o mesmo tratamento de "item ativo" da navegação principal.
 */
export function Pagination({ page, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null; // No pagination needed for single page
  }

  const previousPage = page - 1;
  const nextPage = page + 1;
  const showPrevious = page > 1;
  const showNext = page < totalPages;

  // Generate page numbers to display
  const pageNumbers: (number | string)[] = [];

  if (totalPages <= 7) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Show first page
    pageNumbers.push(1);

    // Add ellipsis if needed
    if (page > 3) {
      pageNumbers.push("...");
    }

    // Add pages around current page
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i);
      }
    }

    // Add ellipsis if needed
    if (page < totalPages - 2) {
      pageNumbers.push("...");
    }

    // Add last page
    pageNumbers.push(totalPages);
  }

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2 mt-8">
      {/* Previous button */}
      {showPrevious ? (
        <Link href={`?page=${previousPage}`} className={LINK_CLASS}>
          ← Anterior
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>← Anterior</span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                …
              </span>
            );
          }

          const isCurrentPage = pageNum === page;

          return isCurrentPage ? (
            <span
              key={pageNum}
              aria-current="page"
              className="px-3 py-2 rounded bg-primary text-primary-foreground font-medium tabular-nums"
            >
              {pageNum}
            </span>
          ) : (
            <Link key={pageNum} href={`?page=${pageNum}`} className={`${LINK_CLASS} tabular-nums`}>
              {pageNum}
            </Link>
          );
        })}
      </div>

      {/* Next button */}
      {showNext ? (
        <Link href={`?page=${nextPage}`} className={LINK_CLASS}>
          Próxima →
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>Próxima →</span>
      )}
    </nav>
  );
}
