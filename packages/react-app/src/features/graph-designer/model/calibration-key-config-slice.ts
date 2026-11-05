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
import {
  createCkvParameters,
  createCkvs,
  deleteCkvs as deleteCkvsApi,
  type ParamInfo,
} from '~entities/spf-module-data';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

import type {GraphDataSlice} from './graph-data-slice';

export interface CalibrationKeyConfigSlice {
  addCkvs: (
    instanceSystemId: string,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  calibrationKeys: Record<string, GraphKey>;
  deleteCkvs: (
    instanceSystemId: string,
    ckvSystemIds: string[],
  ) => Promise<boolean>;
  initializeCalibrationKeyConfiguration: (
    projectId: string,
  ) => Promise<boolean>;
  resetCalibrationKeyConfiguration: () => void;
  updateCkvParametersOnly: (
    instanceSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  updateConfiguredCkvs: (
    instanceSystemId: string,
    ckvs: ConfiguredCkv[],
    paramInfoByNaturalId?: Record<number, ParamInfo>,
  ) => void;
}

const initialState = {
  calibrationKeys: {},
};

/**
 * Creates the calibration-key-config slice for composing into
 * `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `GraphDataSlice` —
 * `deleteCkvs`/`updateConfiguredCkvs` read `get().graphData` and
 * write through `get().updateModuleCkvsLocal`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 */
export function createCalibrationKeyConfigSlice<
  S extends CalibrationKeyConfigSlice & GraphDataSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): CalibrationKeyConfigSlice {
  const readConfiguredCkvs = (instanceSystemId: string): ConfiguredCkv[] => {
    const current =
      get().graphData?.moduleInstances[instanceSystemId]?.ckvs ?? [];
    const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
      get().calibrationKeys,
    );
    return transformCkvsToConfiguredCkvs(current, keyDefinitionsByNaturalId);
  };

  /**
   * CKV parameters are module-scoped, so any CKV already on the module
   * carries the full, real parameter info for every naturalId still in use.
   * Used as the default source when a caller doesn't have a fresher set
   * (e.g. a just-completed parameter create/update) to pass explicitly —
   * this is what lets transformConfiguredCkvsToCkvs rebuild supportedParameters
   * without blanking out name/systemId/description for untouched CKVs.
   */
  const buildParamInfoByNaturalId = (
    instanceSystemId: string,
  ): Record<number, ParamInfo> => {
    const current =
      get().graphData?.moduleInstances[instanceSystemId]?.ckvs ?? [];
    const lookup: Record<number, ParamInfo> = {};
    for (const ckv of current) {
      for (const param of ckv.supportedParameters) {
        lookup[param.naturalId] = param;
      }
    }
    return lookup;
  };

  return {
    ...initialState,

    addCkvs: async (
      instanceSystemId: string,
      valueSystemIdCombinations: string[][],
      parameterSystemIds: string[],
    ) => {
      try {
        const paramResult = await createCkvParameters(
          projectId,
          instanceSystemId,
          {parameterSystemIds},
        );
        if (hasBlockingIssues(paramResult)) {
          showToast(
            getIssueMessage(paramResult, 'Failed to update CKV parameters'),
            'danger',
          );
          return false;
        }
        const paramInfoByNaturalId = Object.fromEntries(
          (paramResult.data?.parameters ?? []).map((param) => [
            param.naturalId,
            param,
          ]),
        );
        const pidConfig = (paramResult.data?.parameters ?? []).map(
          (param) => param.naturalId,
        );

        const ckvsResult = await createCkvs(projectId, instanceSystemId, {
          ckvs: valueSystemIdCombinations.map((valueSystemIds) => ({
            valueSystemIds,
          })),
        });
        if (hasBlockingIssues(ckvsResult) || !ckvsResult.data) {
          showToast(
            getIssueMessage(ckvsResult, 'Failed to add CKVs'),
            'danger',
          );
          return false;
        }

        const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
          get().calibrationKeys,
        );
        const addedConfiguredCkvs = transformCkvsToConfiguredCkvs(
          ckvsResult.data.addedCkvs,
          keyDefinitionsByNaturalId,
        );
        const removedSystemIds = new Set(ckvsResult.data.removedCkvSystemIds);
        const merged = [
          ...readConfiguredCkvs(instanceSystemId),
          ...addedConfiguredCkvs,
        ]
          .filter((ckv) => !removedSystemIds.has(ckv.systemId))
          .map((ckv) => ({...ckv, pidConfig}));
        get().updateConfiguredCkvs(instanceSystemId, merged, paramInfoByNaturalId);
        return true;
      } catch (error) {
        logger.error(`Error adding CKVs for ${instanceSystemId}`, {
          action: 'add_ckvs',
          component: 'CalibrationKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to add CKVs', 'danger');
        return false;
      }
    },

    deleteCkvs: async (instanceSystemId: string, ckvSystemIds: string[]) => {
      try {
        const result = await deleteCkvsApi(projectId, instanceSystemId, {
          ckvSystemIds,
        });
        if (hasBlockingIssues(result)) {
          showToast(getIssueMessage(result, 'Failed to delete CKVs'), 'danger');
          return false;
        }
        const deletedSystemIds = new Set(
          (result.data ?? []).map((ckv) => ckv.systemId),
        );
        const remaining = readConfiguredCkvs(instanceSystemId).filter(
          (ckv) => !deletedSystemIds.has(ckv.systemId),
        );
        get().updateConfiguredCkvs(instanceSystemId, remaining);
        return true;
      } catch (error) {
        logger.error(`Error deleting CKVs for ${instanceSystemId}`, {
          action: 'delete_ckvs',
          component: 'CalibrationKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to delete CKVs', 'danger');
        return false;
      }
    },

    initializeCalibrationKeyConfiguration: async (projectId: string) => {
      try {
        const result = await getAllKeyDefinitions(projectId);
        if (!hasBlockingIssues(result) && result.data) {
          set({
            calibrationKeys: transformKeyDefinitionsToCalibrationKeys(
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

    resetCalibrationKeyConfiguration: () => {
      set({...initialState} as unknown as Partial<S>);
    },

    updateCkvParametersOnly: async (
      instanceSystemId: string,
      parameterSystemIds: string[],
    ) => {
      try {
        const result = await createCkvParameters(projectId, instanceSystemId, {
          parameterSystemIds,
        });
        if (hasBlockingIssues(result)) {
          showToast(
            getIssueMessage(result, 'Failed to update CKV parameters'),
            'danger',
          );
          return false;
        }
        const paramInfoByNaturalId = Object.fromEntries(
          (result.data?.parameters ?? []).map((param) => [
            param.naturalId,
            param,
          ]),
        );
        const pidConfig = (result.data?.parameters ?? []).map(
          (param) => param.naturalId,
        );
        const updated = readConfiguredCkvs(instanceSystemId).map((ckv) => ({
          ...ckv,
          pidConfig,
        }));
        get().updateConfiguredCkvs(
          instanceSystemId,
          updated,
          paramInfoByNaturalId,
        );
        return true;
      } catch (error) {
        logger.error(`Error updating CKV parameters for ${instanceSystemId}`, {
          action: 'update_ckv_parameters_only',
          component: 'CalibrationKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to update CKV parameters', 'danger');
        return false;
      }
    },

    updateConfiguredCkvs: (
      instanceSystemId: string,
      ckvs: ConfiguredCkv[],
      paramInfoByNaturalId?: Record<number, ParamInfo>,
    ) => {
      const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
        get().calibrationKeys,
      );
      get().updateModuleCkvsLocal(
        instanceSystemId,
        transformConfiguredCkvsToCkvs(
          ckvs,
          keyDefinitionsByNaturalId,
          paramInfoByNaturalId ?? buildParamInfoByNaturalId(instanceSystemId),
        ),
      );
    },
  };
}
