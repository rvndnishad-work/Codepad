import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
  currentParams: Record<string, string | undefined>;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  baseUrl,
  currentParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  function getPageUrl(page: number) {
    const urlParams = new URLSearchParams();
    Object.entries(currentParams).forEach(([key, val]) => {
      if (val && key !== "page") {
        urlParams.set(key, val);
      }
    });
    urlParams.set("page", page.toString());
    return `${baseUrl}?${urlParams.toString()}`;
  }

  // Generate page numbers range (e.g. current page +/- 2)
  const range: (number | string)[] = [];
  const delta = 1; // Number of pages to show around current page

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      // Add ellipsis if there is a gap
      if (range.length > 0) {
        const last = range[range.length - 1];
        if (typeof last === "number" && i - last > 1) {
          range.push("...");
        }
      }
      range.push(i);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface border-t border-border mt-px">
      <div className="text-xs text-muted">
        Showing <span className="font-semibold text-fg">{startItem}</span> to{" "}
        <span className="font-semibold text-fg">{endItem}</span> of{" "}
        <span className="font-semibold text-fg">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous page link */}
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-fg hover:bg-elevated/50 hover:border-border-strong transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted/30 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}

        {/* Numbered page buttons */}
        {range.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-muted/60 text-xs font-medium"
              >
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <Link
              key={`page-${pageNum}`}
              href={getPageUrl(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center transition ${
                isActive
                  ? "bg-accent text-bg"
                  : "border border-border text-muted hover:text-fg hover:bg-elevated/50 hover:border-border-strong"
              }`}
            >
              {pageNum}
            </Link>
          );
        })}

        {/* Next page link */}
        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-fg hover:bg-elevated/50 hover:border-border-strong transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted/30 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
