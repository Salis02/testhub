import React, { useState, useRef } from 'react'
import { api } from '@/services/api'
import { Image, UploadCloud, X, Loader2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface MediaUploaderProps {
  mediaUrl?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  label?: string
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  mediaUrl,
  onChange,
  disabled = false,
  label = 'Lampirkan Gambar Soal (Opsional)',
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.warning('Format Tidak Didukung', 'Harap unggah file gambar (PNG, JPG, WebP, SVG).')
      return
    }

    // Validate size (max 2MB per backend)
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Ukuran Terlalu Besar', 'Ukuran gambar maksimal adalah 2MB.')
      return
    }

    try {
      setIsUploading(true)
      const res = await api.uploadMedia(file)
      onChange(res.url)
      toast.success('Gambar Berhasil Diunggah', `${res.filename} telah dilampirkan ke soal.`)
    } catch (err) {
      toast.error('Gagal Mengunggah Gambar', (err as Error).message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (mediaUrl) {
      try {
        await api.deleteMedia(mediaUrl)
      } catch {
        // ignore backend delete error
      }
      onChange(null)
      toast.info('Gambar Dihapus', 'Lampiran gambar pada soal telah dilepas.')
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-ink-muted flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <Image className="w-3.5 h-3.5 text-accent" />
          <span>{label}</span>
        </span>
        {mediaUrl && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            Tersimpan di server
          </span>
        )}
      </label>

      {mediaUrl ? (
        <div className="relative group rounded-md border border-borderline bg-canvas p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-16 h-16 rounded bg-surface border border-borderline overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={mediaUrl}
                alt="Preview Lampiran Soal"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback for broken link
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/></svg>'
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-ink truncate">
                {mediaUrl.split('/').pop() || 'gambar-soal'}
              </p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-accent hover:underline block truncate"
              >
                Lihat gambar penuh
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="p-1.5 rounded-md text-ink-muted hover:text-red-500 hover:bg-surface transition-colors"
            title="Hapus gambar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
            id={`file-upload-${Math.random().toString(36).substring(2, 7)}`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-md border border-dashed border-borderline hover:border-accent bg-surface/50 hover:bg-canvas text-xs text-ink-muted hover:text-ink transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Mengunggah gambar ke server...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors" />
                <span>Pilih file gambar (Maks. 2MB: PNG, JPG, WebP, SVG)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
