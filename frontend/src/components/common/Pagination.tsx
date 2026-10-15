import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className,
}) => {
  if (totalPages <= 1 && !totalItems) return null

  // Generate page numbers
  const getPages = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis')[] = []
    const leftSibling = Math.max(currentPage - 1, 1)
    const rightSibling = Math.min(currentPage + 1, totalPages)

    const showLeftEllipsis = leftSibling > 2
    const showRightEllipsis = rightSibling < totalPages - 1

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftRange = [1, 2, 3, 4]
      pages.push(...leftRange, 'ellipsis', totalPages)
    } else if (showLeftEllipsis && !showRightEllipsis) {
      const rightRange = [totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
      pages.push(1, 'ellipsis', ...rightRange)
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages)
    }

    return pages
  }

  const pages = getPages()

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-sm font-normal text-ink-muted',
        className
      )}
    >
      {/* Total Items Info & Page Size Selector */}
      <div className="flex items-center gap-3">
        {typeof totalItems === 'number' && (
          <span>
            Menampilkan <span className="font-medium text-ink font-mono tabular-nums">{Math.min(totalItems, (currentPage - 1) * (pageSize || 10) + 1)}</span>
            {' - '}
            <span className="font-medium text-ink font-mono tabular-nums">{Math.min(totalItems, currentPage * (pageSize || 10))}</span> dari{' '}
            <span className="font-medium text-ink font-mono tabular-nums">{totalItems}</span> data
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-surface border border-borderline rounded-md px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Buttons */}
      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="p-1.5 rounded-md border border-borderline bg-surface text-ink hover:bg-surface/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-ink-muted select-none">
                …
              </span>
            )
          }

          const isActive = p === currentPage
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'min-w-[32px] h-8 px-2 rounded-md text-xs font-mono tabular-nums transition-colors',
                isActive
                  ? 'bg-accent text-white font-medium shadow-sm'
                  : 'bg-surface border border-borderline text-ink hover:bg-surface/80'
              )}
            >
              {p}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Selanjutnya"
          className="p-1.5 rounded-md border border-borderline bg-surface text-ink hover:bg-surface/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}
