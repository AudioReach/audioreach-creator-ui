/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface ValidationResult {
  autoFixCallback?: (result: ValidationResult) => void
  canAutoFix?: boolean
  canShowControls?: boolean
  description: string
  errorCode: string
  errorDetails: string
  id: string
  severity: SeverityType.Critical | SeverityType.Error | SeverityType.Warning
  showControlsCallback?: (result: ValidationResult) => void
}

export enum SeverityType {
  Critical = "critical",
  Error = "error",
  Warning = "warning",
}

// Constant for "All Types" filter option
export const ALL_SEVERITIES = "all"

export interface ValidationResultStore {
  addValidationResult: (resultData: {
    autoFixCallback?: (result: ValidationResult) => void
    canAutoFix?: boolean
    canShowControls?: boolean
    description: string
    errorCode: string
    errorDetails: string
    severity: SeverityType.Critical | SeverityType.Error | SeverityType.Warning
    showControlsCallback?: (result: ValidationResult) => void
  }) => boolean

  clearRowSelection: () => boolean

  clearValidationResults: () => boolean

  // Issue counts
  criticalCount: number

  errorCount: number
  // Search & Filter state
  searchQuery: string

  selectedRowId: string | null

  selectedSeverities: string[] // ["all"] or combination of ["critical", "error", "warning"]
  // Row selection actions
  selectRow: (id: string) => boolean

  setSearchQuery: (query: string) => boolean
  setSelectedSeverities: (severities: string[]) => boolean
  updateCounts: () => boolean

  validationResults: ValidationResult[]
  warningCount: number
}
