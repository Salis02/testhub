import { Question, QuestionOption, DifficultyLevel } from '@/types'

export interface ParseRowError {
  row: number
  message: string
  rawQuestionText?: string
}

export interface ParseSpreadsheetResult {
  questions: Question[]
  errors: ParseRowError[]
}

/**
 * Parses CSV/TSV text into an array of string arrays (rows and cells).
 * Handles quotes ("..."), escaped quotes (""), newlines, and auto-detects delimiter (, ; \t).
 */
export function parseCsvRows(content: string, delimiter?: string): string[][] {
  const clean = content.replace(/^\uFEFF/, '').trim()
  if (!clean) return []

  // Auto-detect delimiter if not explicitly provided
  let delim = delimiter
  if (!delim) {
    const firstLine = clean.split(/\r?\n/)[0] || ''
    const tabs = (firstLine.match(/\t/g) || []).length
    const semis = (firstLine.match(/;/g) || []).length
    const commas = (firstLine.match(/,/g) || []).length
    if (tabs > commas && tabs > semis) {
      delim = '\t'
    } else if (semis > commas) {
      delim = ';'
    } else {
      delim = ','
    }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delim) {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\r') {
        if (nextChar === '\n') i++
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else if (char === '\n') {
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    rows.push(currentRow)
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0))
}

const OPTION_LETTERS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E']

/**
 * Parses raw spreadsheet rows into validated Question objects.
 */
export function parseSpreadsheetToQuestions(
  rawText: string,
  startQuestionNumber = 1
): ParseSpreadsheetResult {
  const rows = parseCsvRows(rawText)
  const questions: Question[] = []
  const errors: ParseRowError[] = []

  if (rows.length === 0) {
    return { questions, errors }
  }

  // Check if first row is header
  const firstRow = rows[0]
  const isHeaderRow = firstRow.some((cell) =>
    /^(no|nomor|soal|pertanyaan|question|pilihan|kunci)$/i.test(cell.trim())
  )

  let dataRows = isHeaderRow ? rows.slice(1) : rows
  let colMap = {
    soal: 0,
    optA: 1,
    optB: 2,
    optC: 3,
    optD: 4,
    optE: 5,
    kunci: 6,
    pembahasan: 7,
    poin: 8,
    tingkat: 9,
  }

  if (isHeaderRow) {
    // Dynamic column mapping: initialize with -1 so omitted columns don't alias others
    colMap = {
      soal: -1,
      optA: -1,
      optB: -1,
      optC: -1,
      optD: -1,
      optE: -1,
      kunci: -1,
      pembahasan: -1,
      poin: -1,
      tingkat: -1,
    }
    firstRow.forEach((header, idx) => {
      const h = header.toLowerCase().trim()
      if (/^(soal|pertanyaan|question)$/.test(h)) colMap.soal = idx
      else if (/^(pilihan a|opsi a|a)$/.test(h)) colMap.optA = idx
      else if (/^(pilihan b|opsi b|b)$/.test(h)) colMap.optB = idx
      else if (/^(pilihan c|opsi c|c)$/.test(h)) colMap.optC = idx
      else if (/^(pilihan d|opsi d|d)$/.test(h)) colMap.optD = idx
      else if (/^(pilihan e|opsi e|e)$/.test(h)) colMap.optE = idx
      else if (/^(kunci|jawaban|kunci jawaban|key)$/.test(h)) colMap.kunci = idx
      else if (/^(pembahasan|penjelasan|explanation)$/.test(h)) colMap.pembahasan = idx
      else if (/^(poin|bobot|points)$/.test(h)) colMap.poin = idx
      else if (/^(tingkat|tingkat kesulitan|difficulty)$/.test(h)) colMap.tingkat = idx
    })
  } else if (!isNaN(Number(firstRow[0]))) {
    // Positional fallback with leading row number column (1-indexed options)
    colMap = {
      soal: 1,
      optA: 2,
      optB: 3,
      optC: 4,
      optD: 5,
      optE: 6,
      kunci: 7,
      pembahasan: 8,
      poin: 9,
      tingkat: 10,
    }
  }

  dataRows.forEach((row, rowIdx) => {
    const rowNumber = isHeaderRow ? rowIdx + 2 : rowIdx + 1
    const questionText = (row[colMap.soal] || '').trim()

    if (!questionText) {
      errors.push({
        row: rowNumber,
        message: 'Redaksi pertanyaan kosong.',
      })
      return
    }

    if (questionText.length < 5) {
      errors.push({
        row: rowNumber,
        rawQuestionText: questionText,
        message: 'Teks pertanyaan terlalu pendek (minimal 5 karakter).',
      })
      return
    }

    // Extract options
    const rawOptions: { letter: 'A' | 'B' | 'C' | 'D' | 'E'; text: string }[] = []
    const rawA = (row[colMap.optA] || '').trim()
    const rawB = (row[colMap.optB] || '').trim()
    const rawC = (row[colMap.optC] || '').trim()
    const rawD = (row[colMap.optD] || '').trim()
    const rawE = (row[colMap.optE] || '').trim()

    if (rawA) rawOptions.push({ letter: 'A', text: rawA })
    if (rawB) rawOptions.push({ letter: 'B', text: rawB })
    if (rawC) rawOptions.push({ letter: 'C', text: rawC })
    if (rawD) rawOptions.push({ letter: 'D', text: rawD })
    if (rawE) rawOptions.push({ letter: 'E', text: rawE })

    if (rawOptions.length < 2) {
      errors.push({
        row: rowNumber,
        rawQuestionText: questionText,
        message: 'Minimal harus ada 2 pilihan jawaban (Pilihan A dan B).',
      })
      return
    }

    // Resolve correct answer letter
    const rawKey = (row[colMap.kunci] || '').toUpperCase().trim()
    let correctLetter = ''

    if (['A', 'B', 'C', 'D', 'E'].includes(rawKey)) {
      correctLetter = rawKey
    } else if (['1', '2', '3', '4', '5'].includes(rawKey)) {
      const numIdx = parseInt(rawKey, 10) - 1
      if (numIdx < OPTION_LETTERS.length) {
        correctLetter = OPTION_LETTERS[numIdx]
      }
    } else {
      // Try to find if rawKey matches any option text exactly
      const matched = rawOptions.find(
        (o) => o.text.toLowerCase() === rawKey.toLowerCase()
      )
      if (matched) {
        correctLetter = matched.letter
      }
    }

    if (!correctLetter || !rawOptions.some((o) => o.letter === correctLetter)) {
      errors.push({
        row: rowNumber,
        rawQuestionText: questionText,
        message: `Kunci jawaban "${row[colMap.kunci] || ''}" tidak valid atau tidak cocok dengan pilihan yang tersedia.`,
      })
      return
    }

    // Resolve difficulty
    const rawDifficulty = (row[colMap.tingkat] || '').toLowerCase().trim()
    let difficulty: DifficultyLevel = 'medium'
    if (rawDifficulty.includes('mudah') || rawDifficulty === 'easy') {
      difficulty = 'easy'
    } else if (
      rawDifficulty.includes('sulit') ||
      rawDifficulty.includes('sukar') ||
      rawDifficulty === 'hard'
    ) {
      difficulty = 'hard'
    }

    // Resolve points
    const parsedPoints = parseInt((row[colMap.poin] || '').trim(), 10)
    const points = !isNaN(parsedPoints) && parsedPoints >= 1 && parsedPoints <= 100 ? parsedPoints : 5

    // Build question options
    const questionId = `q-import-${Date.now()}-${questions.length + 1}`
    const options: QuestionOption[] = rawOptions.map((opt) => ({
      id: `opt-${questionId}-${opt.letter}`,
      question_id: questionId,
      option_letter: opt.letter,
      option_text: opt.text,
      is_correct: opt.letter === correctLetter,
    }))

    questions.push({
      id: questionId,
      test_id: '',
      question_number: startQuestionNumber + questions.length,
      question_text: questionText,
      question_type: 'multiple_choice',
      difficulty_level: difficulty,
      points,
      explanation: (row[colMap.pembahasan] || '').trim(),
      media_url: null,
      options,
    })
  })

  return { questions, errors }
}

/**
 * Returns RFC 4180 CSV template string with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function generateQuestionCsvTemplate(): string {
  return (
    '\uFEFF' +
    'No,Soal,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci,Pembahasan,Poin,Tingkat\n' +
    '1,Ibu kota negara Indonesia yang baru diresmikan adalah...,Bandung,Nusantara,Surabaya,Medan,Makassar,B,IKN Nusantara berlokasi di Kalimantan Timur,5,easy\n' +
    '2,Semua mamalia bernapas dengan paru-paru. Ikan paus adalah mamalia. Kesimpulan yang tepat adalah...,Ikan paus bernapas dengan insang,Ikan paus tidak bernapas di air,Ikan paus bernapas dengan paru-paru,Ikan paus bukan mamalia sejati,Ikan paus berkembang biak dengan bertelur,C,Silogisme kategorik standar SKD CPNS TIU,5,medium\n' +
    '3,Jika x + 3 = 8 dan 2y - 4 = 6 maka nilai x * y adalah...,15,20,25,30,35,C,x = 5 dan y = 5 sehingga x * y = 25,5,medium\n'
  )
}

/**
 * Triggers a browser file download for the template CSV.
 */
export function downloadQuestionCsvTemplate(): void {
  const content = generateQuestionCsvTemplate()
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'template_soal_testhub.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports an array of Question objects into downloadable CSV spreadsheet.
 */
export function exportQuestionsToCsv(testTitle: string, questions: Question[]): void {
  const sanitize = (text?: string | null) => {
    if (!text) return '""'
    const clean = text.replace(/"/g, '""')
    return `"${clean}"`
  }

  let csv = '\uFEFFNo,Soal,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci,Pembahasan,Poin,Tingkat\n'

  questions.forEach((q, idx) => {
    const optMap: Record<string, string> = {}
    let correctLetter = 'A'
    ;(q.options || []).forEach((o) => {
      optMap[o.option_letter] = o.option_text
      if (o.is_correct) correctLetter = o.option_letter
    })

    const row = [
      idx + 1,
      sanitize(q.question_text),
      sanitize(optMap['A'] || ''),
      sanitize(optMap['B'] || ''),
      sanitize(optMap['C'] || ''),
      sanitize(optMap['D'] || ''),
      sanitize(optMap['E'] || ''),
      correctLetter,
      sanitize(q.explanation || ''),
      q.points || 5,
      q.difficulty_level || 'medium',
    ]

    csv += row.join(',') + '\n'
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const slug = testTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'soal'
  link.setAttribute('href', url)
  link.setAttribute('download', `ekspor_soal_${slug}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
