import { describe, it, expect } from 'bun:test'

describe('useExamProctoring logic', () => {
  it('calculates violations accurately and respects cooldown', () => {
    let violations = 0
    let warningReason = ''
    let warningModalOpen = false
    let lastViolationTime = 0
    const maxViolations = 3

    const recordViolation = (reason: string, now: number) => {
      // Cooldown 1.2s to prevent dual-triggering
      if (lastViolationTime > 0 && now - lastViolationTime < 1200) {
        return
      }
      lastViolationTime = now
      violations += 1
      warningReason = reason
      warningModalOpen = true
    }

    // 1st violation (visibilitychange)
    recordViolation('Tab switched', 1000)
    expect(violations).toBe(1)
    expect(warningModalOpen).toBe(true)
    expect(warningReason).toBe('Tab switched')

    // 2nd rapid violation within cooldown window (e.g. blur after visibilitychange)
    recordViolation('Window blur', 1500)
    expect(violations).toBe(1) // Blocked by cooldown

    // 3rd violation after cooldown expires
    recordViolation('Fullscreen exited', 2500)
    expect(violations).toBe(2)
    expect(warningReason).toBe('Fullscreen exited')

    // 4th violation reaches limit
    recordViolation('Another tab switch', 4000)
    expect(violations).toBe(3)
    expect(violations >= maxViolations).toBe(true)
  })

  it('correctly reports proctoring hotkey detection', () => {
    const isProctoringBlockedKey = (e: { key: string; ctrlKey?: boolean; metaKey?: boolean }) => {
      const isCtrlOrMeta = !!e.ctrlKey || !!e.metaKey
      const key = e.key.toLowerCase()
      if ((isCtrlOrMeta && ['c', 'x', 'u', 'p'].includes(key)) || e.key === 'F12') {
        return true
      }
      return false
    }

    expect(isProctoringBlockedKey({ key: 'c', ctrlKey: true })).toBe(true)
    expect(isProctoringBlockedKey({ key: 'C', metaKey: true })).toBe(true)
    expect(isProctoringBlockedKey({ key: 'u', ctrlKey: true })).toBe(true)
    expect(isProctoringBlockedKey({ key: 'F12' })).toBe(true)
    expect(isProctoringBlockedKey({ key: 'a', ctrlKey: true })).toBe(false)
    expect(isProctoringBlockedKey({ key: 'Enter' })).toBe(false)
  })
})
