/*
 * Why an import stopped. Nothing is written when any of these is thrown. Reasons use the wording of
 * MotionBackupValidation.swift, located by a path such as "workouts[3].exercises[0].sets[2]".
 */

export type ImportErrorCode =
  | 'tooLarge'
  | 'unreadable'
  | 'csvMalformed'
  | 'csvRow'
  | 'wrongType'
  | 'unsupportedVersion'
  | 'invalid'
  | 'conflict'
  | 'sandbox'

export interface ImportIssue {
  path: string
  reason: string
}

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    readonly detail: { row?: number; issues?: ImportIssue[] } = {},
  ) {
    super(code)
    this.name = 'ImportError'
  }
}
