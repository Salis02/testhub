import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/context/ToastContext'

export interface ProctoringOptions {
  enabled?: boolean
  requireFullscreen?: boolean
  detectTabSwitch?: boolean
  blockCopyPaste?: boolean
  maxViolations?: number
  isArmed?: boolean
  onViolation?: (violationCount: number, reason: string) => void
  onMaxViolationsReached?: () => void
}

export interface UseExamProctoringReturn {
  isFullscreen: boolean
  violations: number
  warningModalOpen: boolean
  warningReason: string
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  dismissWarning: () => void
}

/**
 * useExamProctoring provides automated client-side examination integrity guardrails:
 * 1. Fullscreen Focus Mode (CAT CPNS / UTBK simulation)
 * 2. Tab-switch & Window Blur Detection (visibilitychange & blur listeners)
 * 3. Copy/Cut/ContextMenu blocking with tactile warnings
 *
 * shortcut: client-side proctoring cannot prevent a secondary physical phone camera; upgrade to WebRTC AI proctoring when real-time biometric verification is required.
 */
export function useExamProctoring({
  enabled = true,
  requireFullscreen = false,
  detectTabSwitch = false,
  blockCopyPaste = false,
  maxViolations = 3,
  isArmed = false,
  onViolation,
  onMaxViolationsReached,
}: ProctoringOptions = {}): UseExamProctoringReturn {
  const toast = useToast()
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && !!document.fullscreenElement
  })
  const [violations, setViolations] = useState<number>(0)
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false)
  const [warningReason, setWarningReason] = useState<string>('')

  const wasFullscreenRef = useRef(false)
  const lastViolationTimeRef = useRef(0)
  const onViolationRef = useRef(onViolation)
  const onMaxViolationsReachedRef = useRef(onMaxViolationsReached)

  useEffect(() => {
    onViolationRef.current = onViolation
    onMaxViolationsReachedRef.current = onMaxViolationsReached
  }, [onViolation, onMaxViolationsReached])

  const recordViolation = useCallback(
    (reason: string) => {
      if (!enabled || !isArmed) return

      // Cooldown 1.2s to prevent dual-triggering between visibilitychange and window blur
      const now = Date.now()
      if (lastViolationTimeRef.current > 0 && now - lastViolationTimeRef.current < 1200) {
        return
      }
      lastViolationTimeRef.current = now

      setViolations((prev) => {
        const next = prev + 1
        setWarningReason(reason)
        setWarningModalOpen(true)

        if (onViolationRef.current) {
          onViolationRef.current(next, reason)
        }

        if (next >= maxViolations && onMaxViolationsReachedRef.current) {
          onMaxViolationsReachedRef.current()
        }

        return next
      })
    },
    [enabled, isArmed, maxViolations]
  )

  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        wasFullscreenRef.current = true
        setIsFullscreen(true)
      }
    } catch {
      // Browser rejected fullscreen (e.g. missing user gesture)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        wasFullscreenRef.current = false
        setIsFullscreen(false)
      }
    } catch {
      // Ignored
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }, [enterFullscreen, exitFullscreen])

  const dismissWarning = useCallback(() => {
    setWarningModalOpen(false)
  }, [])

  // 1. Tab-switch & Visibility Listener
  useEffect(() => {
    if (!enabled || !isArmed || !detectTabSwitch) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('Terdeteksi berpindah tab atau meninggalkan jendela ujian.')
      }
    }

    const handleWindowBlur = () => {
      // When window loses focus while document is not yet marked hidden
      if (!document.hidden) {
        recordViolation('Terdeteksi berpindah ke aplikasi lain.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [enabled, isArmed, detectTabSwitch, recordViolation])

  // 2. Fullscreen State & Exit Detection
  useEffect(() => {
    if (!enabled) return

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)

      // Only flag violation if armed AND requireFullscreen is active
      if (isArmed && requireFullscreen && wasFullscreenRef.current && !isNowFullscreen) {
        recordViolation('Terdeteksi keluar dari Mode Layar Penuh (Fokus Ujian).')
        wasFullscreenRef.current = false
      } else if (isNowFullscreen) {
        wasFullscreenRef.current = true
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [enabled, isArmed, requireFullscreen, recordViolation])

  // 3. Copy, Cut, ContextMenu & Developer Tools Hotkey Blocking
  useEffect(() => {
    if (!enabled || !blockCopyPaste) return

    let lastToastTime = 0
    const notifyBlocked = (action: string) => {
      const now = Date.now()
      if (now - lastToastTime > 2000) {
        lastToastTime = now
        toast.warning(
          'Aksi Dinonaktifkan',
          `${action} tidak diizinkan demi menjaga integritas soal tryout.`
        )
      }
    }

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault()
      notifyBlocked('Penyalinan soal')
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      notifyBlocked('Penempelan teks')
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      notifyBlocked('Klik kanan')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      // Block Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste), Ctrl+U (view source), Ctrl+P (print), F12 (dev tools)
      if (
        (isCtrlOrMeta && (key === 'c' || key === 'x' || key === 'v' || key === 'u' || key === 'p')) ||
        e.key === 'F12'
      ) {
        e.preventDefault()
        notifyBlocked('Pintasan keyboard')
      }
    }

    document.addEventListener('copy', handleCopyCut)
    document.addEventListener('cut', handleCopyCut)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('copy', handleCopyCut)
      document.removeEventListener('cut', handleCopyCut)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, blockCopyPaste, toast])

  return {
    isFullscreen,
    violations,
    warningModalOpen,
    warningReason,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    dismissWarning,
  }
}
