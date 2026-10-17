/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {getAllKeyDefinitions} from '~entities/key-definitions';
import {
  buildKeyDefinitionLookup,
  transformCkvsToConfiguredCkvs,
  transformConfiguredCkvsToCkvs,
  transformKeyDefinitionsToCalibrationKeys,
} from '~entities/key-configurator/lib/ckv.transform';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

import type {GraphDataSlice} from './graph-data-slice';

export interface CalibrationKeyConfigSlice {
  availableCalibrationKeys: Record<string, GraphKey>;
  initializeCalibrationKeyConfiguration: (
    projectId: string,
  ) => Promise<boolean>;
  removeConfiguredCkv: (instanceSystemId: string, index: number) => void;
  resetCalibrationKeyConfiguration: () => void;
  updateConfiguredCkvs: (
    instanceSystemId: string,
    ckvs: ConfiguredCkv[],
  ) => void;
}

const initialState = {
  availableCalibrationKeys: {},
};

/**
 * Creates the calibration-key-config slice for composing into
 * `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `GraphDataSlice` —
 * `removeConfiguredCkv`/`updateConfiguredCkvs` read `get().graphData` and
 * write through `get().updateModuleCkvsLocal`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 */
export function createCalibrationKeyConfigSlice<
  S extends CalibrationKeyConfigSlice & GraphDataSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
): CalibrationKeyConfigSlice {
  return {
    ...initialState,

    initializeCalibrationKeyConfiguration: async (projectId: string) => {
      try {
        const result = await getAllKeyDefinitions(projectId);
        if (!hasBlockingIssues(result) && result.data) {
          set({
            availableCalibrationKeys: transformKeyDefinitionsToCalibrationKeys(
              result.data,
            ),
          } as unknown as Partial<S>);
          return true;
        }
        logger.error('Failed to load calibration key definitions', {
          action: 'initialize_calibration_key_configuration',
          component: 'CalibrationKeyConfigSlice',
          error: getIssueMessage(result, 'Failed to fetch key definitions'),
          projectId,
        });
        return false;
      } catch (error) {
        logger.error('Error loading calibration key definitions', {
          action: 'initialize_calibration_key_configuration',
          component: 'CalibrationKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
        return false;
      }
    },

    removeConfiguredCkv: (instanceSystemId: string, index: number) => {
      const current =
        get().graphData?.moduleInstances[instanceSystemId]?.ckvs ?? [];
      const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
        get().availableCalibrationKeys,
      );
      const remaining = transformCkvsToConfiguredCkvs(
        current,
        keyDefinitionsByNaturalId,
      ).filter((_, i) => i !== index);
      get().updateConfiguredCkvs(instanceSystemId, remaining);
    },

    resetCalibrationKeyConfiguration: () => {
      set({...initialState} as unknown as Partial<S>);
    },

    updateConfiguredCkvs: (instanceSystemId: string, ckvs: ConfiguredCkv[]) => {
      const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
        get().availableCalibrationKeys,
      );
      get().updateModuleCkvsLocal(
        instanceSystemId,
        transformConfiguredCkvsToCkvs(ckvs, keyDefinitionsByNaturalId),
      );
    },
  };
}
