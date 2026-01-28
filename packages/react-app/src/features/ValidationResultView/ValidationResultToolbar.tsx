import {useMemo} from "react"

import {
  Ban,
  Copy,
  Download,
  ListFilter,
  Minus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react"

import {IconButton} from "@qualcomm-ui/react/button"
import {Icon} from "@qualcomm-ui/react/icon"
import {InlineIconButton} from "@qualcomm-ui/react/inline-icon-button"
import {Menu} from "@qualcomm-ui/react/menu"
import {TextInput} from "@qualcomm-ui/react/text-input"
import {Tooltip} from "@qualcomm-ui/react/tooltip"
import {Portal} from "@qualcomm-ui/react-core/portal"

import {logger} from "~shared/lib/logger"

import {getSeverityIcon} from "./utils/SeverityIcons"
import {useValidationResultStore} from "./validation-result-store"
import {ALL_SEVERITIES, SeverityType} from "./validation-result-types"

const ValidationResultToolbar: React.FC = () => {
  // Extract necessary state and actions from the validation result store
  const {
    clearValidationResults,
    criticalCount,
    errorCount,
    searchQuery,
    selectedRowId,
    selectedSeverities,
    setSearchQuery,
    setSelectedSeverities,
    validationResults,
    warningCount,
  } = useValidationResultStore()

  // Calculate "All Types" checkbox state (checked, unchecked, or indeterminate)
  const allSeveritiesState = useMemo(() => {
    const individualSeverities = [
      SeverityType.CRITICAL,
      SeverityType.ERROR,
      SeverityType.WARNING,
    ]
    const selectedCount = individualSeverities.filter((severity) =>
      selectedSeverities.includes(severity),
    ).length

    if (selectedCount === 0) {
      return {checked: false, indeterminate: false} // None selected = show no results = unchecked
    }
    if (selectedCount === individualSeverities.length) {
      return {checked: true, indeterminate: false} // All selected = checked
    }
    return {checked: false, indeterminate: true} // Some selected = indeterminate
  }, [selectedSeverities])

  // Handles multiple selection logic for severity filters
  const handleFilterToggle = (severity: string) => {
    logger.debug(`Filter toggle for severity: ${severity}`)
    // Get fresh state from store
    const currentState = useValidationResultStore.getState()
    const currentSelectedSeverities = currentState.selectedSeverities
    if (severity === ALL_SEVERITIES) {
      // Toggle "All Types"
      const individualSeverities = [
        SeverityType.CRITICAL,
        SeverityType.ERROR,
        SeverityType.WARNING,
      ]
      const allToggled = individualSeverities.every((s) =>
        currentSelectedSeverities.includes(s),
      )
      logger.debug(`All severities toggled: ${allToggled}`)
      if (allToggled) {
        setSelectedSeverities([]) // Clear all = show no results
      } else {
        setSelectedSeverities([...individualSeverities]) // Select all individual severities
      }
      return
    }
    // handles toggling individual severity checkboxes (Critical, Error, Warning)
    // Toggle individual severity using fresh state
    if (currentSelectedSeverities.includes(severity)) {
      // Remove this severity
      const newSeverities = currentSelectedSeverities.filter(
        (s) => s !== severity,
      )
      setSelectedSeverities(newSeverities)
    } else {
      // Add this severity
      const newSeverities = [...currentSelectedSeverities, severity]
      setSelectedSeverities(newSeverities)
    }
  }

  // Memoized filtering logic for performance optimization
  // Filters validation results based on selected severities and search query
  // Used by toolbar actions (copy, export) to operate on the same filtered dataset as the table
  const filteredResults = useMemo(() => {
    let filtered = validationResults

    // Apply severity filter (critical, error, warning, or all)
    if (selectedSeverities.length > 0) {
      filtered = filtered.filter((result) =>
        selectedSeverities.includes(result.severity),
      )
    } else {
      filtered = [] // Show no results if no severities selected
    }

    // Apply text search filter (case-insensitive, searches description, error details, and error code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (result) =>
          result.description.toLowerCase().includes(query) ||
          result.errorDetails.toLowerCase().includes(query) ||
          result.errorCode.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [validationResults, selectedSeverities, searchQuery])

  /**
   * Copies the currently selected validation result to clipboard
   * Formats the result with severity, error code, description, and error details
   */
  const copySelectedResult = async () => {
    // Find which validation error the user clicked on
    // Searches through visible results to find the one with matching ID
    const selectedResult = filteredResults.find(
      (result) => result.id === selectedRowId,
    )
    if (!selectedResult) {
      return // No result selected, nothing to copy
    }

    // Format validation result with severity, error code, description, and error details
    const fullText = `[${selectedResult.severity.toUpperCase()}] ${selectedResult.errorCode}: ${selectedResult.description}\n${selectedResult.errorDetails}`

    try {
      await navigator.clipboard.writeText(fullText)
    } catch (error) {
      logger.error(`Failed to copy to clipboard: ${error}`)
    }
  }

  /**
   * Exports all currently filtered validation results to a file
   * Opens a save dialog to let user choose location and filename
   */
  const exportAllResults = async () => {
    // Check if data exists
    if (filteredResults.length === 0) {
      return // No results to export
    }

    // Format all filtered validation results with consistent structure
    const resultsText = filteredResults
      .map((result) => {
        const resultLine = `[${result.severity.toUpperCase()}] ${result.errorCode}: ${result.description}`
        // Add error details with extra newline for separation
        return `${resultLine}\n${result.errorDetails}\n`
      })
      .join("\n") // Join all results with newlines

    try {
      // Import the API request types and electron API
      const {ApiRequest} = await import("@audioreach-creator-ui/api-utils")
      const {electronApi} = await import("~shared/api")

      if (!electronApi) {
        logger.error("Electron API not available")
        return
      }

      // Call the save validation results API
      const response = await electronApi.send({
        data: {
          content: resultsText,
        },
        requestType: ApiRequest.SaveValidationResults,
      })

      if (response.data && !response.data.cancelled) {
        logger.info(`Validation results exported to: ${response.data.filepath}`)
      }
    } catch (error) {
      logger.error(`Failed to export validation results: ${error}`)
    }
  }

  return (
    <div className="flex w-full items-center gap-1 bg-grey px-1">
      {/* Search and Filter Section */}
      <div className="max-w-48">
        <TextInput.Root
          onValueChange={setSearchQuery}
          size="sm"
          startIcon={Search}
          value={searchQuery}
        >
          <TextInput.InputGroup>
            <TextInput.Input
              aria-label="Search validation results"
              placeholder="Search validation results"
            />
            <TextInput.ClearTrigger />
            <Menu.Root>
              <Tooltip
                trigger={
                  <span style={{display: "inline-flex"}}>
                    <Menu.Trigger>
                      <InlineIconButton
                        aria-label="Filter validation results"
                        icon={ListFilter}
                        size="sm"
                      />
                    </Menu.Trigger>
                  </span>
                }
              >
                Filter validation results
              </Tooltip>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    {[
                      ALL_SEVERITIES,
                      SeverityType.CRITICAL,
                      SeverityType.ERROR,
                      SeverityType.WARNING,
                    ].map((severity) => (
                      <Menu.CheckboxItem
                        key={severity}
                        checked={
                          severity === ALL_SEVERITIES
                            ? allSeveritiesState.checked
                            : selectedSeverities.includes(severity)
                        }
                        closeOnSelect={false}
                        onCheckedChange={() => handleFilterToggle(severity)}
                        value={severity}
                      >
                        {severity === ALL_SEVERITIES &&
                        allSeveritiesState.indeterminate ? (
                          <div
                            className="mr-1.5 flex h-4 w-4 items-center justify-center rounded border-2"
                            style={{
                              backgroundColor:
                                "var(--color-background-brand-primary)",
                              borderColor:
                                "var(--color-background-brand-primary)",
                            }}
                          >
                            <Minus
                              size={10}
                              strokeWidth={4}
                              style={{
                                stroke: "var(--color-text-neutral-inverse)",
                              }}
                            />
                          </div>
                        ) : (
                          <Menu.CheckboxItemControl />
                        )}
                        <div className="flex items-center gap-0.5">
                          <span>
                            {severity === ALL_SEVERITIES
                              ? "All Types"
                              : severity}
                          </span>
                          {severity !== ALL_SEVERITIES &&
                            getSeverityIcon(severity)}
                        </div>
                      </Menu.CheckboxItem>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </TextInput.InputGroup>
        </TextInput.Root>
      </div>

      {/* Total Issues Count */}
      <div className="mr-4 text-xs font-medium">
        Total Issues:{" "}
        <span className="font-bold">
          {criticalCount + errorCount + warningCount}
        </span>
      </div>

      {/* Issue Counts Display with Icons */}
      <div className="mr-4 flex items-center gap-3 text-xs font-medium">
        {/* Critical Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon
            icon={TriangleAlert}
            size={12}
            style={{color: "var(--color-icon-support-danger)"}}
          />
          <span className="text-red-500 font-medium">
            {criticalCount} Critical Errors
          </span>
        </div>

        {/* Error Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon
            icon={X}
            size={12}
            style={{color: "var(--color-icon-support-danger)"}}
          />
          <span className="text-red-500 font-medium">{errorCount} Errors</span>
        </div>

        {/* Warning Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon
            icon={TriangleAlert}
            size={12}
            style={{color: "var(--color-icon-support-warning)"}}
          />
          <span className="text-orange-500 font-medium">
            {warningCount} Warnings
          </span>
        </div>
      </div>

      {/* Copy Selected Result Button - only visible when a result is selected AND exists in filtered results */}
      {selectedRowId &&
        filteredResults.length > 0 &&
        filteredResults.some((result) => result.id === selectedRowId) && (
          <Tooltip
            trigger={
              <IconButton
                aria-label="Copy selected validation result"
                emphasis="neutral"
                icon={Copy}
                onClick={copySelectedResult}
                size="sm"
                variant="ghost"
              />
            }
          >
            Copy selected validation result
          </Tooltip>
        )}

      <div className="flex-1" />

      {/* Export All/Filtered Results Button */}
      <Tooltip
        trigger={
          <IconButton
            aria-label={
              searchQuery.trim() || selectedSeverities.length > 0
                ? `Export ${filteredResults.length} filtered results`
                : `Export all ${filteredResults.length} results`
            }
            disabled={filteredResults.length === 0}
            emphasis="neutral"
            icon={Download}
            onClick={exportAllResults}
            size="sm"
            variant="ghost"
          />
        }
      >
        {searchQuery.trim() || selectedSeverities.length > 0
          ? `Export ${filteredResults.length} filtered results`
          : `Export all ${filteredResults.length} results`}
      </Tooltip>

      {/* Clear All Results Button */}
      <Tooltip
        trigger={
          <IconButton
            aria-label="Clear all validation results"
            disabled={validationResults.length === 0}
            emphasis="neutral"
            icon={Ban}
            onClick={clearValidationResults}
            size="sm"
            variant="ghost"
          />
        }
      >
        Clear all validation results
      </Tooltip>
    </div>
  )
}

export default ValidationResultToolbar
