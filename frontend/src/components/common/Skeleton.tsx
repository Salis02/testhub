import React from 'react'

interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-borderline/40 dark:bg-borderline/25 ${className}`}
    />
  )
}

export const TestCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface border border-borderline rounded-lg p-6 shadow-sm flex flex-col justify-between space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-6 w-4/5 rounded" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </div>
      </div>

      <div className="pt-4 border-t border-borderline flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

export const TestPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-canvas animate-pulse">
      {/* Skeleton Header */}
      <div className="h-16 border-b border-borderline bg-surface flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-48 rounded" />
        </div>
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Question Card */}
          <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-borderline">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-6 w-3/4 rounded" />
            </div>
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 rounded-md border border-borderline flex items-center space-x-3">
                  <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-surface border border-borderline rounded-lg p-4 flex justify-between">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        {/* Aside */}
        <div className="lg:col-span-4">
          <div className="bg-surface border border-borderline rounded-lg p-5 space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ResultsPageSkeleton: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-8 w-44 rounded-md" />
      </div>

      {/* Summary Card */}
      <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-start pb-6 border-b border-borderline">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-7 w-72 rounded" />
          </div>
          <Skeleton className="h-8 w-56 rounded-md" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-md bg-canvas border border-borderline space-y-3">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-9 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 space-y-4">
        <Skeleton className="h-5 w-64 rounded" />
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const AdminOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-5 rounded-lg bg-surface border border-borderline space-y-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-surface border border-borderline rounded-lg p-6 space-y-4">
        <Skeleton className="h-5 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded bg-canvas border border-borderline space-y-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-6 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
