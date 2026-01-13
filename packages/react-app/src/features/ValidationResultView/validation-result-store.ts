import {create} from "zustand"

import {logger} from "~shared/lib/logger"

import {
  SeverityType,
  type ValidationResultStore,
} from "./validation-result-types"
// Zustand store for validation result state management
export const useValidationResultStore = create<ValidationResultStore>(
  (set, get) => ({
    addValidationResult: (resultData) => {
      try {
        const newResultId = crypto.randomUUID() // Generate cryptographically secure unique ID
        set((state) => ({
          selectedRowId: newResultId, // Auto-select the new validation result
          validationResults: [
            ...state.validationResults,
            {
              autoFixCallback: resultData.autoFixCallback,
              canAutoFix: resultData.canAutoFix,
              canShowControls: resultData.canShowControls,
              description: resultData.description,
              errorCode: resultData.errorCode,
              errorDetails: resultData.errorDetails,
              id: newResultId,
              severity: resultData.severity,
              showControlsCallback: resultData.showControlsCallback,
            },
          ],
        }))
        // Update counts after adding result
        get().updateCounts()
        return true
      } catch (error) {
        logger.error(`Failed to add validation result: ${error}`)
        return false
      }
    },
    clearRowSelection: () => {
      try {
        set({selectedRowId: null}) // Remove row highlighting
        return true
      } catch (error) {
        logger.error(`Failed to clear row selection: ${error}`)
        return false
      }
    },
    clearValidationResults: () => {
      try {
        set({
          criticalCount: 0, // Reset counts
          errorCount: 0,
          searchQuery: "", // Clear search
          selectedRowId: null, // Clear selection
          selectedSeverities: [
            SeverityType.CRITICAL,
            SeverityType.ERROR,
            SeverityType.WARNING,
          ], // Reset multi-select filter - all types selected by default
          validationResults: [], // Clear all validation results
          warningCount: 0,
        })
        return true
      } catch (error) {
        logger.error(`Failed to clear validation results: ${error}`)
        return false
      }
    },

    // Computed properties for issue counts
    criticalCount: 0,

    errorCount: 0,

    searchQuery: "", // Current search text

    selectedRowId: null, // Currently highlighted row

    selectedSeverities: [
      SeverityType.CRITICAL,
      SeverityType.ERROR,
      SeverityType.WARNING,
    ], // Multi-select severity filters - all types selected by default

    selectRow: (id) => {
      try {
        set({selectedRowId: id}) // Set selected row for highlighting and copy
        return true
      } catch (error) {
        logger.error(`Failed to select row: ${error}`)
        return false
      }
    },

    setSearchQuery: (query) => {
      try {
        set({searchQuery: query}) // Update search filter text
        return true
      } catch (error) {
        logger.error(`Failed to set search query: ${error}`)
        return false
      }
    },
    setSelectedSeverities: (severities) => {
      try {
        set({selectedSeverities: severities}) // Update multi-select severity filters
        return true
      } catch (error) {
        logger.error(`Failed to set selected severities: ${error}`)
        return false
      }
    },
    // Helper function to update counts
    updateCounts: () => {
      try {
        const results = get().validationResults
        set({
          criticalCount: results.filter(
            (result) => result.severity === SeverityType.CRITICAL,
          ).length,
          errorCount: results.filter(
            (result) => result.severity === SeverityType.ERROR,
          ).length,
          warningCount: results.filter(
            (result) => result.severity === SeverityType.WARNING,
          ).length,
        })
        return true
      } catch (error) {
        logger.error(`Failed to update counts: ${error}`)
        return false
      }
    },

    validationResults: [], // All validation result entries

    warningCount: 0,
  }),
)
