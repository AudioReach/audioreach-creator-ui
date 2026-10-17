/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {getAllTagDefinitions} from '~entities/key-definitions';
import {
  buildParamInfoLookup,
  buildTagDefinitionLookup,
  transformConfiguredTkvsToTags,
  transformTagDefinitionsToTagGroups,
} from '~entities/key-configurator/lib/tkv.transform';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import type {
  ConfiguredTkv,
  TagGroup,
} from '~shared/types/key-configurator-config.types';

import {selectConfiguredTkvs} from '../lib/select-configured-tkvs';

import type {GraphDataSlice} from './graph-data-slice';
import type {ModuleListSlice} from './module-list-slice';

export interface ModuleTagKeyConfigSlice {
  addConfiguredTkv: (instanceSystemId: string, tkv: ConfiguredTkv) => void;
  initializeModuleTagKeyConfiguration: (projectId: string) => Promise<boolean>;
  moduleTagKeys: Record<string, TagGroup>;
  removeConfiguredTkv: (instanceSystemId: string, index: number) => void;
  resetModuleTagKeyConfiguration: () => void;
  updateConfiguredTkvs: (
    instanceSystemId: string,
    tkvs: ConfiguredTkv[],
  ) => void;
}

const initialState = {
  moduleTagKeys: {},
};

/**
 * Creates the module-tag-key-config slice for composing into
 * `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `GraphDataSlice` —
 * `addConfiguredTkv`/`removeConfiguredTkv`/`updateConfiguredTkvs` read
 * `get().graphData` and write through `get().updateModuleTagsLocal` — and
 * `ModuleListSlice`, whose `moduleDefinitionsBySystemId` resolves a module
 * instance's parameter PIDs for `buildParamInfoLookup`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 */
export function createModuleTagKeyConfigSlice<
  S extends ModuleTagKeyConfigSlice & GraphDataSlice & ModuleListSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
): ModuleTagKeyConfigSlice {
  const writeThrough = (instanceSystemId: string, tkvs: ConfiguredTkv[]) => {
    const moduleDefinitionSystemId =
      get().graphData?.moduleInstances[instanceSystemId]
        ?.moduleDefinitionSystemId;
    const paramInfoByNaturalId = buildParamInfoLookup(
      get().moduleDefinitionsBySystemId[moduleDefinitionSystemId ?? ''],
    );
    const tagDefinitionsByNaturalId = buildTagDefinitionLookup(
      get().moduleTagKeys,
    );
    get().updateModuleTagsLocal(
      instanceSystemId,
      transformConfiguredTkvsToTags(
        tkvs,
        tagDefinitionsByNaturalId,
        paramInfoByNaturalId,
      ),
    );
  };

  return {
    ...initialState,

    addConfiguredTkv: (instanceSystemId: string, tkv: ConfiguredTkv) => {
      const current = selectConfiguredTkvs(get(), instanceSystemId);
      writeThrough(instanceSystemId, [...current, tkv]);
    },

    initializeModuleTagKeyConfiguration: async (projectId: string) => {
      try {
        const result = await getAllTagDefinitions(projectId);
        if (!hasBlockingIssues(result) && result.data) {
          set({
            moduleTagKeys: transformTagDefinitionsToTagGroups(result.data),
          } as unknown as Partial<S>);
          return true;
        }
        logger.error('Failed to load module tag definitions', {
          action: 'initialize_module_tag_key_configuration',
          component: 'ModuleTagKeyConfigSlice',
          error: getIssueMessage(result, 'Failed to fetch tag definitions'),
          projectId,
        });
        return false;
      } catch (error) {
        logger.error('Error loading module tag definitions', {
          action: 'initialize_module_tag_key_configuration',
          component: 'ModuleTagKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
        return false;
      }
    },

    removeConfiguredTkv: (instanceSystemId: string, index: number) => {
      const current = selectConfiguredTkvs(get(), instanceSystemId);
      writeThrough(
        instanceSystemId,
        current.filter((_, i) => i !== index),
      );
    },

    resetModuleTagKeyConfiguration: () => {
      set({...initialState} as unknown as Partial<S>);
    },

    updateConfiguredTkvs: (instanceSystemId: string, tkvs: ConfiguredTkv[]) => {
      writeThrough(instanceSystemId, tkvs);
    },
  };
}
