/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {getAllTagDefinitions} from '~entities/key-definitions';
import {transformTagDefinitionsToTagGroups} from '~entities/key-configurator/lib/tkv.transform';
import {
  createTags,
  createTkvParameters,
  createTkvs,
  deleteTags,
  deleteTkvParameters,
  deleteTkvs as deleteTkvsApi,
  type TagInfoDto,
} from '~entities/spf-module-data';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {TagGroup} from '~shared/types/key-configurator-config.types';

import type {GraphDataSlice} from './graph-data-slice';

export interface ModuleTagKeyConfigSlice {
  addTkvs: (
    instanceSystemId: string,
    tagGroupId: number,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  deleteTagGroup: (
    instanceSystemId: string,
    tagGroupId: number,
  ) => Promise<boolean>;
  deleteTkvs: (
    instanceSystemId: string,
    targets: Array<{tagGroupId: number; tkvSystemId: string}>,
  ) => Promise<boolean>;
  initializeModuleTagKeyConfiguration: (projectId: string) => Promise<boolean>;
  moduleTagKeys: Record<string, TagGroup>;
  resetModuleTagKeyConfiguration: () => void;
  updateTkvParameters: (
    instanceSystemId: string,
    tkvSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
}

const initialState = {
  moduleTagKeys: {},
};

/**
 * Creates the module-tag-key-config slice for composing into
 * `GraphDesignerStore`.
 *
 * @remarks The store type `S` must also compose `GraphDataSlice` — all
 * mutating actions read `get().graphData` and write through
 * `get().updateModuleTagsLocal`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - The active project ID, threaded into every API call.
 */
export function createModuleTagKeyConfigSlice<
  S extends ModuleTagKeyConfigSlice & GraphDataSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): ModuleTagKeyConfigSlice {
  const readTags = (instanceSystemId: string): TagInfoDto[] =>
    get().graphData?.moduleInstances[instanceSystemId]?.tags ?? [];

  return {
    ...initialState,

    addTkvs: async (
      instanceSystemId: string,
      tagGroupId: number,
      valueSystemIdCombinations: string[][],
      parameterSystemIds: string[],
    ) => {
      try {
        const tags = readTags(instanceSystemId);
        let tag = tags.find((t) => t.naturalId === tagGroupId);
        let mergedTags = tags;

        if (!tag) {
          const tagGroup = Object.values(get().moduleTagKeys).find(
            (group) => group.id === tagGroupId,
          );
          if (!tagGroup) {
            showToast('Failed to add tag: unknown tag group', 'danger');
            return false;
          }
          const tagsResult = await createTags(projectId, instanceSystemId, {
            tagDefinitionSystemIds: [tagGroup.systemId],
          });
          if (hasBlockingIssues(tagsResult) || !tagsResult.data?.[0]) {
            showToast(
              getIssueMessage(tagsResult, 'Failed to create tag'),
              'danger',
            );
            return false;
          }
          tag = tagsResult.data[0];
          mergedTags = [...tags, tag];
        }

        if (valueSystemIdCombinations.length === 0) {
          get().updateModuleTagsLocal(instanceSystemId, mergedTags);
          return true;
        }

        const tkvsResult = await createTkvs(projectId, instanceSystemId, tag.systemId, {
          tkvs: valueSystemIdCombinations.map((valueSystemIds) => ({
            valueSystemIds,
          })),
        });
        if (hasBlockingIssues(tkvsResult) || !tkvsResult.data) {
          showToast(
            getIssueMessage(tkvsResult, 'Failed to add TKVs'),
            'danger',
          );
          return false;
        }

        let newTkvs = tkvsResult.data;
        if (parameterSystemIds.length > 0) {
          const paramsResult = await createTkvParameters(projectId, instanceSystemId, {
            updates: newTkvs.map((tkv) => ({
              parameterSystemIds,
              tkvSystemId: tkv.systemId,
            })),
          });
          if (hasBlockingIssues(paramsResult)) {
            showToast(
              getIssueMessage(paramsResult, 'Failed to set TKV parameters'),
              'danger',
            );
            return false;
          }
          const parametersByTkvSystemId = new Map(
            (paramsResult.data?.tkvParameters ?? []).map((item) => [
              item.tkvSystemId,
              item.parameters,
            ]),
          );
          newTkvs = newTkvs.map((tkv) => ({
            ...tkv,
            supportedParameters:
              parametersByTkvSystemId.get(tkv.systemId) ??
              tkv.supportedParameters,
          }));
        }

        const finalTags = mergedTags.map((t) =>
          t.naturalId === tagGroupId
            ? {...t, tkvs: [...(t.tkvs ?? []), ...newTkvs]}
            : t,
        );
        get().updateModuleTagsLocal(instanceSystemId, finalTags);
        return true;
      } catch (error) {
        logger.error(`Error adding TKVs for ${instanceSystemId}`, {
          action: 'add_tkvs',
          component: 'ModuleTagKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to add TKVs', 'danger');
        return false;
      }
    },

    deleteTagGroup: async (instanceSystemId: string, tagGroupId: number) => {
      try {
        const tags = readTags(instanceSystemId);
        const tag = tags.find((t) => t.naturalId === tagGroupId);
        if (!tag) {
          return false;
        }
        const result = await deleteTags(projectId, instanceSystemId, {
          tagSystemIds: [tag.systemId],
        });
        if (hasBlockingIssues(result)) {
          showToast(getIssueMessage(result, 'Failed to delete tag'), 'danger');
          return false;
        }
        const deletedSystemIds = new Set(
          (result.data ?? []).map((deletedTag) => deletedTag.systemId),
        );
        get().updateModuleTagsLocal(
          instanceSystemId,
          tags.filter((t) => !deletedSystemIds.has(t.systemId)),
        );
        return true;
      } catch (error) {
        logger.error(`Error deleting tag group for ${instanceSystemId}`, {
          action: 'delete_tag_group',
          component: 'ModuleTagKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to delete tag', 'danger');
        return false;
      }
    },

    deleteTkvs: async (
      instanceSystemId: string,
      targets: Array<{tagGroupId: number; tkvSystemId: string}>,
    ) => {
      try {
        const tags = readTags(instanceSystemId);
        const tkvSystemIdsByTagSystemId = new Map<string, string[]>();
        for (const {tagGroupId, tkvSystemId} of targets) {
          const tagSystemId = tags.find(
            (t) => t.naturalId === tagGroupId,
          )?.systemId;
          if (!tagSystemId) {
            continue;
          }
          const existing = tkvSystemIdsByTagSystemId.get(tagSystemId);
          if (existing) {
            existing.push(tkvSystemId);
          } else {
            tkvSystemIdsByTagSystemId.set(tagSystemId, [tkvSystemId]);
          }
        }

        let nextTags = tags;
        for (const [tagSystemId, tkvSystemIds] of tkvSystemIdsByTagSystemId) {
          const result = await deleteTkvsApi(
            projectId,
            instanceSystemId,
            tagSystemId,
            {tkvSystemIds},
          );
          if (hasBlockingIssues(result)) {
            get().updateModuleTagsLocal(instanceSystemId, nextTags);
            showToast(
              getIssueMessage(result, 'Failed to delete TKVs'),
              'danger',
            );
            return false;
          }
          const deletedSystemIds = new Set(
            (result.data ?? []).map((tkv) => tkv.systemId),
          );
          nextTags = nextTags.map((t) =>
            t.systemId === tagSystemId
              ? {
                  ...t,
                  tkvs: (t.tkvs ?? []).filter(
                    (tkv) => !deletedSystemIds.has(tkv.systemId),
                  ),
                }
              : t,
          );
        }
        get().updateModuleTagsLocal(instanceSystemId, nextTags);
        return true;
      } catch (error) {
        logger.error(`Error deleting TKVs for ${instanceSystemId}`, {
          action: 'delete_tkvs',
          component: 'ModuleTagKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to delete TKVs', 'danger');
        return false;
      }
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

    resetModuleTagKeyConfiguration: () => {
      set({...initialState} as unknown as Partial<S>);
    },

    updateTkvParameters: async (
      instanceSystemId: string,
      tkvSystemId: string,
      parameterSystemIds: string[],
    ) => {
      try {
        const tags = readTags(instanceSystemId);
        const tag = tags.find((t) =>
          t.tkvs?.some((tkv) => tkv.systemId === tkvSystemId),
        );
        const tkv = tag?.tkvs?.find((t) => t.systemId === tkvSystemId);
        if (!tag || !tkv) {
          return false;
        }

        const currentSystemIds = new Set(
          tkv.supportedParameters.map((param) => param.systemId),
        );
        const nextSystemIds = new Set(parameterSystemIds);
        const toAdd = parameterSystemIds.filter(
          (id) => !currentSystemIds.has(id),
        );
        const toRemove = tkv.supportedParameters
          .map((param) => param.systemId)
          .filter((id) => !nextSystemIds.has(id));

        let supportedParameters = tkv.supportedParameters;

        if (toAdd.length > 0) {
          const result = await createTkvParameters(projectId, instanceSystemId, {
            updates: [{parameterSystemIds: toAdd, tkvSystemId}],
          });
          if (hasBlockingIssues(result)) {
            showToast(
              getIssueMessage(result, 'Failed to update TKV parameters'),
              'danger',
            );
            return false;
          }
          supportedParameters =
            result.data?.tkvParameters.find(
              (item) => item.tkvSystemId === tkvSystemId,
            )?.parameters ?? supportedParameters;
        }

        if (toRemove.length > 0) {
          const result = await deleteTkvParameters(projectId, instanceSystemId, {
            updates: [{parameterSystemIds: toRemove, tkvSystemId}],
          });
          if (hasBlockingIssues(result)) {
            showToast(
              getIssueMessage(result, 'Failed to update TKV parameters'),
              'danger',
            );
            return false;
          }
          const removedSystemIds = new Set(
            result.data?.updates.find((item) => item.tkvSystemId === tkvSystemId)
              ?.removedParameterSystemIds ?? toRemove,
          );
          supportedParameters = supportedParameters.filter(
            (param) => !removedSystemIds.has(param.systemId),
          );
        }

        const nextTags = tags.map((t) =>
          t.systemId === tag.systemId
            ? {
                ...t,
                tkvs: (t.tkvs ?? []).map((item) =>
                  item.systemId === tkvSystemId
                    ? {...item, supportedParameters}
                    : item,
                ),
              }
            : t,
        );
        get().updateModuleTagsLocal(instanceSystemId, nextTags);
        return true;
      } catch (error) {
        logger.error(`Error updating TKV parameters for ${instanceSystemId}`, {
          action: 'update_tkv_parameters',
          component: 'ModuleTagKeyConfigSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast('Failed to update TKV parameters', 'danger');
        return false;
      }
    },
  };
}
