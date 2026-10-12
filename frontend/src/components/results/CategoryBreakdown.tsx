import React from 'react'
import { CategoryScore } from '@/types'
import { BarChart3 } from 'lucide-react'

export const CategoryBreakdown: React.FC<{ breakdown: CategoryScore[] }> = ({ breakdown }) => {
  return (
    <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 shadow-sm">
      <div className="flex items-center space-x-2 pb-4 mb-6 border-b border-borderline">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">
          Analisis Performa Berdasarkan Domain Kompetensi
        </h3>
      </div>

      <div className="space-y-5">
        {breakdown.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-ink">{item.category_name}</span>
              <span className="font-mono text-ink-muted">
                {item.score} / {item.total_possible} poin ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-borderline/30 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  item.percentage >= 75
                    ? 'bg-accent'
                    : item.percentage >= 50
                    ? 'bg-accent/80'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
