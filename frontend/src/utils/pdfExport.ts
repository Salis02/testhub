/**
 * Scalable Client-side PDF Export Engine for TestHub
 * 
 * Modular utility for exporting DOM elements, certificates, score reports,
 * and exam reviews to official PDF documents.
 * 
 * Features:
 * - Dynamic lazy-loading of `jspdf` and `html2canvas` (Zero bundle bloat)
 * - Automatic single-page centering (e.g. certificates) & multi-page canvas slicing (e.g. reports)
 * - Configurable orientations, margins, metadata, DPI scale, and background colors
 */

export interface PdfExportOptions {
  /** Output file name, default: 'dokumen-testhub.pdf' */
  filename?: string
  /** Page orientation: 'portrait' (default for reports) or 'landscape' (default for certificates) */
  orientation?: 'portrait' | 'landscape'
  /** Paper format, default: 'a4' */
  format?: 'a4' | 'letter'
  /** Margin in millimeters, default: 12mm */
  marginMm?: number
  /** Pixel density multiplier for crisp text/QR, default: 2.5 */
  scale?: number
  /** Background canvas color, default: '#ffffff' */
  backgroundColor?: string
  /** Enable automatic multi-page slicing if content exceeds single page, default: true */
  autoPageSplit?: boolean
  /** PDF Document metadata */
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
}

/**
 * Exports an HTML DOM element to a downloadable PDF file.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'dokumen-testhub.pdf',
    orientation = 'portrait',
    format = 'a4',
    marginMm = 12,
    scale = 2.5,
    backgroundColor = '#ffffff',
    autoPageSplit = true,
    title = 'Dokumen Resmi TestHub',
    author = 'TestHub Examination System',
    subject = 'Dokumen Asesmen dan Evaluasi',
    keywords = 'testhub, asesmen, cpns, snbt, bumn',
    creator = 'TestHub PDF Engine',
  } = options

  // Dynamic imports to preserve small bundle size on initial page loads
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Capture element to canvas with high resolution
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor,
  })

  // Initialize jsPDF instance
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  })

  // Set official document metadata
  pdf.setProperties({
    title,
    author,
    subject,
    keywords,
    creator,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const availableWidth = pageWidth - marginMm * 2
  const availableHeight = pageHeight - marginMm * 2

  // Calculate full image height when scaled to fit available width
  const totalImgHeightMm = (canvas.height * availableWidth) / canvas.width

  // Case 1: Fits comfortably on a single page (e.g. Certificate, Score Card)
  if (totalImgHeightMm <= availableHeight || !autoPageSplit) {
    const yOffset = totalImgHeightMm < availableHeight
      ? (pageHeight - totalImgHeightMm) / 2
      : marginMm

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', marginMm, yOffset, availableWidth, totalImgHeightMm)
  } else {
    // Case 2: Multi-page document (e.g. Full Test Review, Diagnostic Report)
    // Slices the high-res canvas into clean page chunks
    const pxPageHeight = (availableHeight * canvas.width) / availableWidth
    const totalPages = Math.ceil(canvas.height / pxPageHeight)

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = pxPageHeight
    const sliceCtx = sliceCanvas.getContext('2d')

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage(format, orientation)
      }

      if (sliceCtx) {
        sliceCtx.fillStyle = backgroundColor
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)

        const sourceY = page * pxPageHeight
        const sourceHeight = Math.min(pxPageHeight, canvas.height - sourceY)

        sliceCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          sliceCanvas.width,
          sourceHeight
        )

        const pageImgData = sliceCanvas.toDataURL('image/png')
        const renderHeightMm = (sourceHeight * availableWidth) / canvas.width
        pdf.addImage(pageImgData, 'PNG', marginMm, marginMm, availableWidth, renderHeightMm)
      }
    }
  }

  // Ensure file extension is .pdf
  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
  pdf.save(cleanFilename)
}

/**
 * Convenience helper to export an element by its HTML ID.
 */
export async function exportElementByIdToPdf(
  elementId: string,
  options: PdfExportOptions = {}
): Promise<void> {
  const el = document.getElementById(elementId)
  if (!el) {
    throw new Error(`Elemen dengan ID "${elementId}" tidak ditemukan untuk ekspor PDF.`)
  }
  return exportElementToPdf(el, options)
}
