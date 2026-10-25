import { describe, it, expect } from 'bun:test'
import {
  parseCsvRows,
  parseSpreadsheetToQuestions,
  generateQuestionCsvTemplate,
} from './spreadsheetParser'

describe('spreadsheetParser', () => {
  it('parses comma-separated rows with quotes', () => {
    const csv = `No,Soal,Opsi A,Opsi B,Kunci\n1,"Berapa 2 + 2, coba tebak?",3,4,B`
    const rows = parseCsvRows(csv)
    expect(rows.length).toBe(2)
    expect(rows[1][1]).toBe('Berapa 2 + 2, coba tebak?')
    expect(rows[1][2]).toBe('3')
    expect(rows[1][3]).toBe('4')
  })

  it('parses semicolon-separated rows (Indonesian Excel default)', () => {
    const csv = `No;Soal;Pilihan A;Pilihan B;Pilihan C;Kunci\n1;Ibu kota RI;Jakarta;Bandung;Surabaya;A`
    const rows = parseCsvRows(csv)
    expect(rows.length).toBe(2)
    expect(rows[1][1]).toBe('Ibu kota RI')
    expect(rows[1][2]).toBe('Jakarta')
    expect(rows[1][5]).toBe('A')
  })

  it('parses tab-separated text (direct copy-paste from Excel)', () => {
    const tsv = `1\tSoal Geografi Dunia\tParis\tLondon\tBerlin\tRoma\tTokyo\tA\tIbu kota Prancis\t5\teasy`
    const result = parseSpreadsheetToQuestions(tsv, 1)
    expect(result.errors.length).toBe(0)
    expect(result.questions.length).toBe(1)
    expect(result.questions[0].question_text).toBe('Soal Geografi Dunia')
    expect(result.questions[0].options.length).toBe(5)
    expect(result.questions[0].options[0].is_correct).toBe(true)
    expect(result.questions[0].options[1].is_correct).toBe(false)
  })

  it('parses standard template CSV correctly', () => {
    const template = generateQuestionCsvTemplate()
    const result = parseSpreadsheetToQuestions(template, 1)
    expect(result.errors.length).toBe(0)
    expect(result.questions.length).toBe(3)
    expect(result.questions[0].options.find((o) => o.is_correct)?.option_letter).toBe('B')
    expect(result.questions[1].options.find((o) => o.is_correct)?.option_letter).toBe('C')
  })

  it('collects validation errors for invalid rows', () => {
    const invalidCsv = `No,Soal,Pilihan A,Pilihan B,Kunci\n1,abc,A,B,A\n2,,A,B,A\n3,Pertanyaan lengkap tapi kunci salah,A,B,Z`
    const result = parseSpreadsheetToQuestions(invalidCsv, 1)
    expect(result.questions.length).toBe(0)
    expect(result.errors.length).toBe(3)
    expect(result.errors[0].message).toContain('terlalu pendek')
    expect(result.errors[1].message).toContain('Redaksi pertanyaan kosong')
    expect(result.errors[2].message).toContain('tidak valid')
  })
})
