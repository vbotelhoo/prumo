import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
};

/**
 * Pagination component for numbered page navigation.
 * Renders [← Anterior] [1] [2] … [N] [Próxima →] using Link for server-side routing.
 * Current page is highlighted. Navigation buttons are disabled on boundaries.
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
    <div className="flex items-center justify-center gap-2 mt-8">
      {/* Previous button */}
      {showPrevious ? (
        <Link
          href={`?page=${previousPage}`}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed">
          ← Anterior
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-600 dark:text-gray-400">
                …
              </span>
            );
          }

          const isCurrentPage = pageNum === page;

          return isCurrentPage ? (
            <span
              key={pageNum}
              className="px-3 py-2 rounded bg-blue-600 text-white font-medium"
            >
              {pageNum}
            </span>
          ) : (
            <Link
              key={pageNum}
              href={`?page=${pageNum}`}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {pageNum}
            </Link>
          );
        })}
      </div>

      {/* Next button */}
      {showNext ? (
        <Link
          href={`?page=${nextPage}`}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Próxima →
        </Link>
      ) : (
        <span className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed">
          Próxima →
        </span>
      )}
    </div>
  );
}
