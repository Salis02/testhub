import { useState, useMemo } from 'react'

export interface UsePaginationOptions {
  totalItems: number
  initialPage?: number
  pageSize?: number
}

export interface UsePaginationReturn {
  currentPage: number
  pageSize: number
  totalPages: number
  offset: number
  hasNextPage: boolean
  hasPrevPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
  pageRange: (number | 'ellipsis')[]
}

export function usePagination({
  totalItems,
  initialPage = 1,
  pageSize: initialPageSize = 10,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure current page is within valid bounds
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage)
  }

  const offset = (validCurrentPage - 1) * pageSize
  const hasNextPage = validCurrentPage < totalPages
  const hasPrevPage = validCurrentPage > 1

  const goToPage = (page: number) => {
    const target = Math.min(Math.max(1, page), totalPages)
    setCurrentPage(target)
  }

  const nextPage = () => {
    if (hasNextPage) goToPage(validCurrentPage + 1)
  }

  const prevPage = () => {
    if (hasPrevPage) goToPage(validCurrentPage - 1)
  }

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setCurrentPage(1)
  }

  // Generate pagination item range with ellipsis, e.g. [1, 2, 'ellipsis', 9, 10]
  const pageRange = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis')[] = []
    const leftSiblingIndex = Math.max(validCurrentPage - 1, 1)
    const rightSiblingIndex = Math.min(validCurrentPage + 1, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = [1, 2, 3, 4]
      pages.push(...leftRange, 'ellipsis', totalPages)
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = [totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
      pages.push(1, 'ellipsis', ...rightRange)
    } else {
      pages.push(1, 'ellipsis', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, 'ellipsis', totalPages)
    }

    return pages
  }, [totalPages, validCurrentPage])

  return {
    currentPage: validCurrentPage,
    pageSize,
    totalPages,
    offset,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    pageRange,
  }
}
