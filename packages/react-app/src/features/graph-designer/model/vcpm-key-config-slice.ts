/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  buildKeyDefinitionLookup,
  filterVoiceKeys,
} from '~entities/key-configurator/lib/ckv.transform';
import {getAllKeyDefinitions} from '~entities/key-definitions';
import {
  createVcpmCkvs,
  deleteVcpmCkv as deleteVcpmCkvApi,
  transformVcpmCkvsToConfiguredCkvs,
} from '~entities/vcpm';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

import type {CalibrationKeyConfigSlice} from './calibration-key-config-slice';
import type {VcpmDataSlice} from './vcpm-data-slice';

export interface VcpmKeyConfigSlice {
  addVcpmCkvs: (
    subgraphSystemId: string,
    valueSystemIdCombinations: string[][],
  ) => Promise<boolean>;
  configuredVcpmCkvsBySubgraphId: Record<string, ConfiguredCkv[]>;
  deleteVcpmCkv: (
    subgraphSystemId: string,
    ckvSystemId: string,
  ) => Promise<boolean>;
  loadVoiceKeys: () => Promise<void>;
  voiceKeys: Record<string, GraphKey>;
}

/**
 * Creates the vcpm-key-config slice for composing into `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `CalibrationKeyConfigSlice`
 * (`calibrationKeys`, read to resolve VCPM CKV key/value names) and
 * `VcpmDataSlice`'s `vcpmDataBySubgraphId`/`selectVcpmCalIndex` (read/called
 * here to keep the selected index in sync when CKVs are added or removed).
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - Project identifier bound at construction time.
 */
export function createVcpmKeyConfigSlice<
  S extends VcpmKeyConfigSlice &
    Pick<CalibrationKeyConfigSlice, 'calibrationKeys'> &
    Pick<VcpmDataSlice, 'selectVcpmCalIndex' | 'vcpmDataBySubgraphId'>,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): VcpmKeyConfigSlice {
  return {
    addVcpmCkvs: async (subgraphSystemId, valueSystemIdCombinations) => {
      try {
        const result = await createVcpmCkvs(projectId, subgraphSystemId, {
          ckv: valueSystemIdCombinations.map((valueSystemIds) => ({
            valueSystemIds,
          })),
        });
        if (hasBlockingIssues(result) || !result.data) {
          const message = getIssueMessage(result, 'Failed to add VCPM keys');
          showToast(message, 'danger');
          logger.error(message, {
            action: 'addVcpmCkvs',
            component: 'vcpm-key-config-slice',
          });
          return false;
        }

        const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
          get().calibrationKeys,
        );
        const added = transformVcpmCkvsToConfiguredCkvs(
          result.data.addedCkvs,
          keyDefinitionsByNaturalId,
        );
        const removedIds = new Set(result.data.removedCkvSystemIds);
        const existing = (
          get().configuredVcpmCkvsBySubgraphId[subgraphSystemId] ?? []
        ).filter((ckv) => !removedIds.has(ckv.systemId));

        set({
          configuredVcpmCkvsBySubgraphId: {
            ...get().configuredVcpmCkvsBySubgraphId,
            [subgraphSystemId]: [...existing, ...added],
          },
        } as Partial<S>);

        const entry = get().vcpmDataBySubgraphId[subgraphSystemId];
        if (!entry?.selectedCkvSystemId && added[0]) {
          await get().selectVcpmCalIndex(subgraphSystemId, added[0].systemId);
        }
        return true;
      } catch (error) {
        const message = 'Failed to add VCPM keys';
        showToast(message, 'danger');
        logger.error(message, {
          action: 'addVcpmCkvs',
          component: 'vcpm-key-config-slice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
      }
    },

    configuredVcpmCkvsBySubgraphId: {},

    deleteVcpmCkv: async (subgraphSystemId, ckvSystemId) => {
      try {
        const result = await deleteVcpmCkvApi(
          projectId,
          subgraphSystemId,
          ckvSystemId,
        );
        // No `|| !result.data` check — this endpoint returns no body on
        // success (Task 1's 204 fix), so a missing body is not a failure.
        if (hasBlockingIssues(result)) {
          const message = getIssueMessage(result, 'Failed to delete VCPM key');
          showToast(message, 'danger');
          logger.error(message, {
            action: 'deleteVcpmCkv',
            component: 'vcpm-key-config-slice',
          });
          return false;
        }

        set({
          configuredVcpmCkvsBySubgraphId: {
            ...get().configuredVcpmCkvsBySubgraphId,
            [subgraphSystemId]: (
              get().configuredVcpmCkvsBySubgraphId[subgraphSystemId] ?? []
            ).filter((ckv) => ckv.systemId !== ckvSystemId),
          },
        } as Partial<S>);

        const remaining =
          get().configuredVcpmCkvsBySubgraphId[subgraphSystemId] ?? [];
        const entry = get().vcpmDataBySubgraphId[subgraphSystemId];
        if (entry?.selectedCkvSystemId === ckvSystemId) {
          await get().selectVcpmCalIndex(
            subgraphSystemId,
            remaining[0]?.systemId ?? '',
          );
        }
        return true;
      } catch (error) {
        const message = 'Failed to delete VCPM key';
        showToast(message, 'danger');
        logger.error(message, {
          action: 'deleteVcpmCkv',
          component: 'vcpm-key-config-slice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
      }
    },

    loadVoiceKeys: async () => {
      try {
        const result = await getAllKeyDefinitions(projectId);
        if (hasBlockingIssues(result) || !result.data) {
          return;
        }
        set({
          voiceKeys: filterVoiceKeys(result.data),
        } as Partial<S>);
      } catch (error) {
        logger.error('Failed to load voice keys', {
          action: 'loadVoiceKeys',
          component: 'vcpm-key-config-slice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    voiceKeys: {},
  };
}
