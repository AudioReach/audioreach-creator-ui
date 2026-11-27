/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {buildKeyDefinitionLookup} from '~entities/key-configurator/lib/ckv.transform';
import {
  getVcpmCalData,
  getVcpmCkvs,
  transformVcpmCkvsToConfiguredCkvs,
  updateVcpmCalData,
  type UpdateVcpmCalDataRequestDto,
  type VcpmParameterCalDataDto,
} from '~entities/vcpm';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {createDefaultTreeViewUiState} from '~shared/lib/tree-view-ui-state';
import type {SliceStatus} from '~shared/store/global-store.types';
import type {ConfiguredCkv} from '~shared/types/key-configurator-config.types';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

import type {CalibrationKeyConfigSlice} from './calibration-key-config-slice';

export interface VcpmCalDataEntry {
  calDataByCkvId?: Record<string, VcpmParameterCalDataDto[]>;
  isSaving?: boolean;
  selectedCkvSystemId?: string;
  status: SliceStatus;
  uiState?: GenericTreeViewUiState;
}

export interface VcpmDataSlice {
  clearVcpmData: (subgraphSystemId: string) => void;
  queryVcpmData: (
    subgraphSystemId: string,
    subgraphName: string,
  ) => Promise<boolean>;
  selectVcpmCalIndex: (subgraphSystemId: string, ckvSystemId: string) => void;
  setVcpmCalData: (
    subgraphSystemId: string,
    parameterSystemId: string,
    body: UpdateVcpmCalDataRequestDto,
  ) => Promise<boolean>;
  setVcpmOpenTab: (subgraphSystemId: string, tabId: string | null) => void;
  setVcpmUiState: (
    subgraphSystemId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  vcpmDataBySubgraphId: Record<string, VcpmCalDataEntry>;
  vcpmOpenTabs: Record<string, string | null>;
}

const DEFAULT_ENTRY: VcpmCalDataEntry = {status: 'uninitialized'};

/**
 * Creates the vcpm-data slice for composing into `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `CalibrationKeyConfigSlice`
 * (`calibrationKeys`, read to resolve VCPM CKV key/value names) and the
 * not-yet-implemented `VcpmKeyConfigSlice`'s `configuredVcpmCkvsBySubgraphId`
 * (written here on a successful query, same cross-slice `set()` pattern
 * `CalibrationKeyConfigSlice.addCkvs` uses) — declared structurally inline
 * below since `VcpmKeyConfigSlice` (Task 9) doesn't exist yet.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - Project identifier bound at construction time.
 */
export function createVcpmDataSlice<
  S extends VcpmDataSlice &
    Pick<CalibrationKeyConfigSlice, 'calibrationKeys'> & {
      configuredVcpmCkvsBySubgraphId: Record<string, ConfiguredCkv[]>;
    },
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): VcpmDataSlice {
  const patchEntry = (
    subgraphSystemId: string,
    patch: Partial<VcpmCalDataEntry>,
  ): void => {
    const existing = get().vcpmDataBySubgraphId[subgraphSystemId];
    set({
      vcpmDataBySubgraphId: {
        ...get().vcpmDataBySubgraphId,
        [subgraphSystemId]: {...(existing ?? DEFAULT_ENTRY), ...patch},
      },
    } as Partial<S>);
  };

  const removeEntry = (subgraphSystemId: string): void => {
    const {[subgraphSystemId]: _removed, ...rest} = get().vcpmDataBySubgraphId;
    set({vcpmDataBySubgraphId: rest} as Partial<S>);
  };

  // On failure, design.md requires leaving state exactly as it was before
  // the call — restores the pre-fetch entry (or absence of one) rather
  // than leaving the 'loading' patch applied before the await in place.
  const restoreEntry = (
    subgraphSystemId: string,
    previousEntry: VcpmCalDataEntry | undefined,
  ): void => {
    if (previousEntry === undefined) {
      removeEntry(subgraphSystemId);
      return;
    }
    set({
      vcpmDataBySubgraphId: {
        ...get().vcpmDataBySubgraphId,
        [subgraphSystemId]: previousEntry,
      },
    } as Partial<S>);
  };

  return {
    clearVcpmData: (subgraphSystemId) => {
      removeEntry(subgraphSystemId);
    },

    queryVcpmData: async (subgraphSystemId, subgraphName) => {
      const previousEntry = get().vcpmDataBySubgraphId[subgraphSystemId];
      patchEntry(subgraphSystemId, {status: 'loading'});
      try {
        const [ckvsResult, calDataResult] = await Promise.all([
          getVcpmCkvs(projectId, subgraphSystemId),
          getVcpmCalData(projectId, subgraphSystemId),
        ]);

        if (
          hasBlockingIssues(ckvsResult) ||
          !ckvsResult.data ||
          hasBlockingIssues(calDataResult) ||
          !calDataResult.data
        ) {
          const message = getIssueMessage(
            ckvsResult,
            `Failed to load VCPM data for ${subgraphName}`,
          );
          showToast(message, 'danger');
          logger.error(message, {
            action: 'queryVcpmData',
            component: 'vcpm-data-slice',
          });
          restoreEntry(subgraphSystemId, previousEntry);
          return false;
        }

        const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
          get().calibrationKeys,
        );
        const configuredCkvs = transformVcpmCkvsToConfiguredCkvs(
          ckvsResult.data.ckv,
          keyDefinitionsByNaturalId,
        );
        const calDataByCkvId = Object.fromEntries(
          calDataResult.data.calData.map((entry) => [
            entry.ckvSystemId,
            entry.parameters,
          ]),
        );
        const defaultCkvSystemId = configuredCkvs[0]?.systemId;
        // Opening the tab should start with every available parameter
        // checked, matching the module tab's CKV parameter checklist
        // default, rather than requiring a manual select-all click.
        const defaultSelectedIds = defaultCkvSystemId
          ? (calDataByCkvId[defaultCkvSystemId] ?? []).map(
              (parameter) => parameter.systemId,
            )
          : [];

        set({
          configuredVcpmCkvsBySubgraphId: {
            ...get().configuredVcpmCkvsBySubgraphId,
            [subgraphSystemId]: configuredCkvs,
          },
        } as Partial<S>);
        patchEntry(subgraphSystemId, {
          calDataByCkvId,
          selectedCkvSystemId: defaultCkvSystemId,
          status: 'ready',
          uiState: {
            ...createDefaultTreeViewUiState(),
            selectedIds: defaultSelectedIds,
          },
        });
        return true;
      } catch (error) {
        const message = `Failed to load VCPM data for ${subgraphName}`;
        showToast(message, 'danger');
        logger.error(message, {
          action: 'queryVcpmData',
          component: 'vcpm-data-slice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        restoreEntry(subgraphSystemId, previousEntry);
        return false;
      }
    },

    selectVcpmCalIndex: (subgraphSystemId, ckvSystemId) => {
      patchEntry(subgraphSystemId, {selectedCkvSystemId: ckvSystemId});
    },

    // `parameterSystemId` is accepted per design.md's literal signature but
    // is not otherwise used — the PUT body's own `systemId` already carries
    // the parameter identity; kept for signature parity and in case the
    // backend needs it as a distinct path/query parameter once verified.
    setVcpmCalData: async (subgraphSystemId, _parameterSystemId, body) => {
      const entry = get().vcpmDataBySubgraphId[subgraphSystemId];
      const ckvSystemId = entry?.selectedCkvSystemId;
      if (!ckvSystemId) {
        return false;
      }

      patchEntry(subgraphSystemId, {isSaving: true});
      try {
        const result = await updateVcpmCalData(
          projectId,
          subgraphSystemId,
          ckvSystemId,
          body,
        );
        if (hasBlockingIssues(result) || !result.data) {
          const message = getIssueMessage(
            result,
            'Failed to save VCPM calibration data',
          );
          showToast(message, 'danger');
          logger.error(message, {
            action: 'setVcpmCalData',
            component: 'vcpm-data-slice',
          });
          return false;
        }

        const updated = result.data;
        const latest = get().vcpmDataBySubgraphId[subgraphSystemId];
        const currentForCkv = latest?.calDataByCkvId?.[ckvSystemId] ?? [];
        set({
          vcpmDataBySubgraphId: {
            ...get().vcpmDataBySubgraphId,
            [subgraphSystemId]: {
              ...latest,
              calDataByCkvId: {
                ...latest?.calDataByCkvId,
                [ckvSystemId]: currentForCkv.map((parameter) =>
                  parameter.systemId === updated.systemId ? updated : parameter,
                ),
              },
            },
          },
        } as Partial<S>);
        return true;
      } catch (error) {
        const message = 'Failed to save VCPM calibration data';
        showToast(message, 'danger');
        logger.error(message, {
          action: 'setVcpmCalData',
          component: 'vcpm-data-slice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
      } finally {
        patchEntry(subgraphSystemId, {isSaving: false});
      }
    },

    setVcpmOpenTab: (subgraphSystemId, tabId) => {
      set({
        vcpmOpenTabs: {...get().vcpmOpenTabs, [subgraphSystemId]: tabId},
      } as Partial<S>);
    },

    setVcpmUiState: (subgraphSystemId, patch) => {
      const current = get().vcpmDataBySubgraphId[subgraphSystemId];
      patchEntry(subgraphSystemId, {
        uiState: {
          ...createDefaultTreeViewUiState(),
          ...current?.uiState,
          ...patch,
        },
      });
    },

    vcpmDataBySubgraphId: {},
    vcpmOpenTabs: {},
  };
}
