/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {
  Ban,
  Copy,
  Download,
  ListFilter,
  Minus,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Icon} from '@qualcomm-ui/react/icon';
import {Menu} from '@qualcomm-ui/react/menu';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Portal} from '@qualcomm-ui/react-core/portal';

import {useValidationResults} from '~features/graph-designer';
import {logger} from '~shared/lib/logger';
import type {
  SeverityType,
  ValidationResult,
} from '~shared/store/tab-store-slices/validation-result-slice';

import {filterValidationResults} from './lib/filter-validation-results';
import {formatValidationResult} from './lib/format-validation-result';
import {getSeverityIcon} from './utils/severity-icons';

const ALL_SEVERITIES = 'all';
const SEVERITY_TYPES: SeverityType[] = ['critical', 'error', 'warning'];

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
  } = useValidationResults();

  // Calculate "All Types" checkbox state (checked, unchecked, or indeterminate)
  const allSeveritiesState = useMemo(() => {
    const individualSeverities: SeverityType[] = SEVERITY_TYPES;
    const selectedCount = individualSeverities.filter((severity) =>
      selectedSeverities.includes(severity),
    ).length;

    if (selectedCount === 0) {
      return {checked: false, indeterminate: false}; // None selected = show no results = unchecked
    }
    if (selectedCount === individualSeverities.length) {
      return {checked: true, indeterminate: false}; // All selected = checked
    }
    return {checked: false, indeterminate: true}; // Some selected = indeterminate
  }, [selectedSeverities]);

  // Handles multiple selection logic for severity filters
  const handleFilterToggle = (severity: string) => {
    logger.debug(`Filter toggle for severity: ${severity}`);
    if (severity === ALL_SEVERITIES) {
      const allToggled = SEVERITY_TYPES.every((s) =>
        selectedSeverities.includes(s),
      );
      logger.debug(`All severities toggled: ${allToggled}`);
      if (allToggled) {
        setSelectedSeverities([]); // Clear all = show no results
      } else {
        setSelectedSeverities([...SEVERITY_TYPES]); // Select all individual severities
      }
      return;
    }
    if (selectedSeverities.includes(severity as SeverityType)) {
      setSelectedSeverities(selectedSeverities.filter((s) => s !== severity));
    } else {
      setSelectedSeverities([...selectedSeverities, severity as SeverityType]);
    }
  };

  const filteredResults = useMemo(
    () =>
      filterValidationResults(
        validationResults,
        selectedSeverities,
        searchQuery,
      ),
    [validationResults, selectedSeverities, searchQuery],
  );

  /**
   * Copies the currently selected validation result to clipboard
   * Formats the result with severity, error code, description, and error details
   */
  const copySelectedResult = async () => {
    // Find which validation error the user clicked on
    // Searches through visible results to find the one with matching ID
    const selectedResult = filteredResults.find(
      (result) => result.id === selectedRowId,
    );
    if (!selectedResult) {
      return; // No result selected, nothing to copy
    }

    // Format validation result with severity, error code, message, and error details
    const fullText = formatValidationResult(selectedResult);

    try {
      await navigator.clipboard.writeText(fullText);
    } catch (error) {
      logger.error(
        `Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  /**
   * Exports all currently filtered validation results to a file
   * Opens a save dialog to let user choose location and filename
   */
  const exportAllResults = async () => {
    // Check if data exists
    if (filteredResults.length === 0) {
      return; // No results to export
    }

    // Format all filtered validation results with consistent structure
    const resultsText = filteredResults
      .map((result: ValidationResult) => `${formatValidationResult(result)}\n`)
      .join('\n');

    try {
      // Import the API request types and electron API
      const {ApiRequest} = await import('@audioreach-creator-ui/api-utils');
      const {electronApi} = await import('~shared/api');

      if (!electronApi) {
        logger.error('Electron API not available');
        return;
      }

      // Call the save validation results API
      const response = await electronApi.send({
        data: {
          content: resultsText,
        },
        requestType: ApiRequest.SaveValidationResults,
      });

      if (response.data && !response.data.cancelled) {
        logger.info(
          `Validation results exported to: ${response.data.filepath}`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to export validation results: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="bg-neutral-02 flex w-full items-center gap-1 px-1">
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
                  <span style={{display: 'inline-flex'}}>
                    <Menu.Trigger>
                      <Menu.InlineIconButton
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
                    {[ALL_SEVERITIES, ...SEVERITY_TYPES].map((severity) => (
                      <Menu.CheckboxItem
                        key={severity}
                        checked={
                          severity === ALL_SEVERITIES
                            ? allSeveritiesState.checked
                            : selectedSeverities.includes(
                                severity as SeverityType,
                              )
                        }
                        closeOnSelect={false}
                        onCheckedChange={() => handleFilterToggle(severity)}
                        value={severity}
                      >
                        {severity === ALL_SEVERITIES &&
                        allSeveritiesState.indeterminate ? (
                          <div className="bg-brand-primary border-brand-primary mr-1.5 flex h-4 w-4 items-center justify-center rounded border-2">
                            <Minus
                              className="text-neutral-inverse"
                              size={10}
                              strokeWidth={4}
                            />
                          </div>
                        ) : (
                          <Menu.CheckboxItemControl />
                        )}
                        <div className="flex items-center gap-0.5">
                          <span>
                            {severity === ALL_SEVERITIES
                              ? 'All Types'
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
        Total Issues:{' '}
        <span className="font-bold">
          {criticalCount + errorCount + warningCount}
        </span>
      </div>

      {/* Issue Counts Display with Icons */}
      <div className="mr-4 flex items-center gap-3 text-xs font-medium">
        {/* Critical Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon
            className="text-icon-support-danger"
            icon={TriangleAlert}
            size={12}
          />
          <span className="font-medium text-red-500">
            {criticalCount} Critical Errors
          </span>
        </div>

        {/* Error Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon className="text-icon-support-danger" icon={X} size={12} />
          <span className="font-medium text-red-500">{errorCount} Errors</span>
        </div>

        {/* Warning Count with Icon */}
        <div className="flex items-center gap-1">
          <Icon
            className="text-icon-support-warning"
            icon={TriangleAlert}
            size={12}
          />
          <span className="font-medium text-orange-500">
            {warningCount} Warnings
          </span>
        </div>
      </div>

      {/* Copy Selected Result Button - only visible when a result is selected AND exists in filtered results */}
      {selectedRowId &&
        filteredResults.some(
          (result: ValidationResult) => result.id === selectedRowId,
        ) && (
          <Tooltip
            trigger={
              <IconButton
                aria-label="Copy selected validation result"
                emphasis="neutral"
                icon={Copy}
                onClick={() => void copySelectedResult()}
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
            onClick={() => void exportAllResults()}
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
  );
};

export default ValidationResultToolbar;
