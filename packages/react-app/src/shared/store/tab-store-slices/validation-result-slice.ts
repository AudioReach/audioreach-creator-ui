/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {SliceStatus} from '../global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeverityType = 'critical' | 'error' | 'warning' | 'info';

export interface ValidationResult {
  connectionId?: string;
  id: string;
  message: string;
  moduleInstanceId?: string;
  severity: SeverityType;
  subgraphId?: string;
}

export interface ValidationResultSlice {
  addValidationResult: (result: Omit<ValidationResult, 'id'>) => void;
  clearRowSelection: () => void;
  clearValidationResults: () => void;
  criticalCount: number;
  errorCount: number;
  searchQuery: string;
  selectedRowId: string | null;
  selectedSeverities: SeverityType[];
  selectRow: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSeverities: (severities: SeverityType[]) => void;
  validationResults: ValidationResult[];
  validationStatus: SliceStatus;
  warningCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCounts(results: ValidationResult[]): {
  criticalCount: number;
  errorCount: number;
  warningCount: number;
} {
  let criticalCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const r of results) {
    if (r.severity === 'critical') {
      criticalCount++;
    } else if (r.severity === 'error') {
      errorCount++;
    } else if (r.severity === 'warning') {
      warningCount++;
    }
  }

  return {criticalCount, errorCount, warningCount};
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the validation-result slice for composing into a tab store.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the validation-result slice.
 */
export function createValidationResultSlice<S extends ValidationResultSlice>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
): ValidationResultSlice {
  return {
    addValidationResult: (result: Omit<ValidationResult, 'id'>) => {
      const id = crypto.randomUUID();
      const newResult: ValidationResult = {...result, id};

      logger.debug('validationResultSlice: addValidationResult', {
        action: 'addValidationResult',
        component: 'validationResultSlice',
      });

      set((state: S) => {
        const updated = [...state.validationResults, newResult];
        return {
          ...computeCounts(updated),
          validationResults: updated,
        } as Partial<S>;
      });
    },

    clearRowSelection: () => {
      logger.debug('validationResultSlice: clearRowSelection');
      set({selectedRowId: null} as Partial<S>);
    },

    clearValidationResults: () => {
      logger.debug('validationResultSlice: clearValidationResults');
      set({
        criticalCount: 0,
        errorCount: 0,
        validationResults: [] as ValidationResult[],
        warningCount: 0,
      } as Partial<S>);
    },

    criticalCount: 0,

    errorCount: 0,

    searchQuery: '',

    selectedRowId: null,

    selectedSeverities: [],

    selectRow: (id: string) => {
      logger.debug('validationResultSlice: selectRow', {
        action: 'selectRow',
        component: 'validationResultSlice',
      });
      // Verify the row exists in current results
      const state = get();
      const exists = state.validationResults.some((r) => r.id === id);
      if (!exists) {
        logger.warn('validationResultSlice: selectRow — id not found', {
          action: 'selectRow',
          component: 'validationResultSlice',
        });
      }
      set({selectedRowId: id} as Partial<S>);
    },

    setSearchQuery: (query: string) => {
      logger.debug('validationResultSlice: setSearchQuery');
      set({searchQuery: query} as Partial<S>);
    },

    setSelectedSeverities: (severities: SeverityType[]) => {
      logger.debug('validationResultSlice: setSelectedSeverities');
      set({selectedSeverities: severities} as Partial<S>);
    },

    validationResults: [],

    validationStatus: 'uninitialized',

    warningCount: 0,
  };
}
