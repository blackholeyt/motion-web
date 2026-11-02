import { ImportError } from './errors'

/*
 * CSV side of the iOS import. "Export CSV" writes the full backup as one row per record
 * (CompleteCSVCodec.swift, header motion_backup_v18); decoding turns it back into the same JSON
 * object as "Export Backup", so both files run through one validator and importer.
 */

export const completeHeader = ['motion_backup_v18', 'record_index', 'value_json']
const maximumRows = 1_000_000
const maximumIndex = 100_000

/** WorkoutCSVImporter.parse: RFC 4180 with an optional BOM; a stray quote rejects the file. */
export function parseCSV(text: string): string[][] {
  const source = (text.startsWith('﻿') ? text.slice(1) : text).replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
          closed = true
        }
      } else field += char
    } else if (char === ',' || char === '\n') {
      row.push(field)
      field = ''
      closed = false
      if (char === '\n') {
        rows.push(row)
        row = []
      }
    } else if (char === '"' && field === '' && !closed) {
      quoted = true
    } else {
      if (closed || char === '"') throw new ImportError('csvMalformed')
      field += char
    }
  }
  if (quoted) throw new ImportError('csvMalformed')
  if (field !== '' || row.length > 0 || closed) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** The header names the format; older Motion CSV files and the plain workout CSV get their own message. */
export function csvKind(rows: string[][]): 'complete' | 'olderBackup' | 'workoutCSV' | 'unknown' {
  const first = rows[0] ?? []
  if (first.length === 3 && first.every((value, index) => value === completeHeader[index])) return 'complete'
  if (/^motion_backup_v([1-9]|1[0-7])$/.test(first[0] ?? '')) return 'olderBackup'
  if (first[0] === 'workout_date' && first[1] === 'workout_name') return 'workoutCSV'
  return 'unknown'
}

/** CompleteCSVCodec.decode with the same structural rules. */
export function decodeCompleteCSV(rows: string[][]): Record<string, unknown> {
  if (csvKind(rows) !== 'complete' || rows.length > maximumRows) throw new ImportError('csvMalformed')
  const object: Record<string, unknown> = {}
  const arrays = new Map<string, Map<number, unknown>>()
  for (const [line, row] of rows.slice(1).entries()) {
    const at = { row: line + 2 }
    if (row.length !== 3 || row[0] === '') throw new ImportError('csvRow', at)
    const [key, index, json] = row as [string, string, string]
    let value: unknown
    try {
      value = JSON.parse(json)
    } catch {
      throw new ImportError('csvRow', at)
    }
    if (index === '' || index === '[]') {
      if (key in object || arrays.has(key)) throw new ImportError('csvRow', at)
      if (index === '[]' && !(Array.isArray(value) && value.length === 0)) throw new ImportError('csvRow', at)
      object[key] = value
    } else {
      const position = Number(index)
      const values = arrays.get(key) ?? new Map<number, unknown>()
      if (!Number.isInteger(position) || position < 0 || position >= maximumIndex || String(position) !== index || key in object || values.has(position)) {
        throw new ImportError('csvRow', at)
      }
      values.set(position, value)
      arrays.set(key, values)
    }
  }
  for (const [key, values] of arrays) {
    const list: unknown[] = []
    for (let position = 0; position < values.size; position++) {
      if (!values.has(position)) throw new ImportError('csvMalformed')
      list.push(values.get(position))
    }
    object[key] = list
  }
  return object
}
