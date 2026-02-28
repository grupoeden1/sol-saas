import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];

  // Always show first page
  pages.push(1);

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  // Pages around current
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-1">
      {currentPage > 1 && (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          className="rounded-lg px-3 py-2 text-sm text-foreground-muted transition-all hover:bg-solar-500/10 hover:text-foreground"
          aria-label="Página anterior"
        >
          &larr;
        </Link>
      )}

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-foreground-muted">
            &hellip;
          </span>
        ) : (
          <Link
            key={page}
            href={`${basePath}?page=${page}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              page === currentPage
                ? 'bg-solar-500/20 text-solar-300'
                : 'text-foreground-muted hover:bg-solar-500/10 hover:text-foreground'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          className="rounded-lg px-3 py-2 text-sm text-foreground-muted transition-all hover:bg-solar-500/10 hover:text-foreground"
          aria-label="Próxima página"
        >
          &rarr;
        </Link>
      )}
    </nav>
  );
}
