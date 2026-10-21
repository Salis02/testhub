/**
 * Centralized formatting utilities adhering to TestHub style.md
 */

/**
 * Format number to Indonesian Rupiah (IDR)
 * Example: 25000 -> "Rp 25.000"
 */
export function formatRupiah(amount?: number | null): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

/**
 * Format seconds into mm:ss or hh:mm:ss format (ideal for tabular-nums timers)
 * Example: 125 -> "02:05" | 3665 -> "01:01:05"
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format ISO date string into Indonesian locale format
 * Example: "2026-10-15T20:00:00Z" -> "15 Okt 2026, 20:00"
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
      : {}),
  }).format(date)
}

/**
 * Mask sensitive user identifier (email or session string) for privacy / leaderboards
 * Example: "user@example.com" -> "u***@example.com"
 */
export function maskIdentifier(identifier: string | null | undefined): string {
  if (!identifier) return 'Anonim'
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@')
    if (name.length <= 2) return `${name}***@${domain}`
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
  }
  if (identifier.length > 8) {
    return `${identifier.slice(0, 4)}...${identifier.slice(-4)}`
  }
  return identifier
}

/**
 * Truncate long text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
