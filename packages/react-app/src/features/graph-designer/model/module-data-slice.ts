/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  type CalDataDto,
  type ChangeInfoDto,
  type CkvDto,
  getCalData,
  getTagData,
  type ParameterDetailDto,
  putCalData,
  putTagData,
  queryModuleIndices,
  type TagDataDto,
  type TagInfoDto,
  type UpdateSpfModuleCalDataRequest,
  type UpdateSpfModuleTagDataRequest,
} from '~entities/spf-module-data';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

import {toUserFriendlyError} from '../lib/to-user-friendly-error';

export interface ModuleDataEntry {
  calData?: {
    availableCalIndices: CkvDto[];
    dto?: CalDataDto;
    error?: string;
    groupedUiState?: GenericTreeViewUiState;
    /** How `dto` was last produced — tells the panel whether to pass 'get' (full re-seed) or 'set' (per-path reconciliation) to the tree view. */
    lastMutation?: 'get' | 'set';
    loadedScope: 'none' | 'partial' | 'full';
    selectedCalIndex?: string;
    status: SliceStatus;
    uiState?: GenericTreeViewUiState;
  };
  moduleName: string;
  tagData?: {
    availableTagIndices: TagInfoDto[];
    dto?: TagDataDto;
    error?: string;
    /** How `dto` was last produced — tells the panel whether to pass 'get' (full re-seed) or 'set' (per-path reconciliation) to the tree view. */
    lastMutation?: 'get' | 'set';
    selectedTagIndex?: string;
    /** Parent tag's systemId — tag-data GET/PUT is keyed by (tag, tkv). */
    selectedTagSystemId?: string;
    status: SliceStatus;
    uiState?: GenericTreeViewUiState;
  };
}

function mergeParametersById<
  T extends {changeInfo: ChangeInfoDto; parameters: ParameterDetailDto[]},
>(existingDto: T, responseDto: T): T {
  const byId = new Map(
    responseDto.parameters.map((param) => [param.parameterId, param]),
  );
  return {
    ...existingDto,
    changeInfo: responseDto.changeInfo,
    parameters: existingDto.parameters.map(
      (param) => byId.get(param.parameterId) ?? param,
    ),
  };
}

export interface ModuleDataSlice {
  clearModuleData: (moduleId: string) => void;
  fetchCalData: (
    moduleId: string,
    ckvSystemId: string,
    scope?: 'partial' | 'full',
    paramSystemIds?: string[],
  ) => Promise<boolean>;
  fetchTagData: (
    moduleId: string,
    tagSystemId: string,
    tkvSystemId: string,
  ) => Promise<boolean>;
  moduleDataByModuleId: Record<string, ModuleDataEntry>;
  moduleOpenTabs: Record<string, string>;
  queryModuleData: (moduleId: string, moduleName: string) => Promise<boolean>;
  setCalUiState: (
    moduleId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  setGroupedCalUiState: (
    moduleId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  setModuleOpenTab: (moduleId: string, tabId: string) => void;
  setTagUiState: (
    moduleId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  updateCalData: (
    moduleId: string,
    payload: UpdateSpfModuleCalDataRequest,
  ) => Promise<CalDataDto | void>;
  updateTagData: (
    moduleId: string,
    payload: UpdateSpfModuleTagDataRequest,
  ) => Promise<TagDataDto | void>;
}

type CalDataState = NonNullable<ModuleDataEntry['calData']>;
type TagDataState = NonNullable<ModuleDataEntry['tagData']>;

const DEFAULT_CAL_DATA: CalDataState = {
  availableCalIndices: [],
  loadedScope: 'none',
  status: 'loading',
};
const DEFAULT_TAG_DATA: TagDataState = {
  availableTagIndices: [],
  status: 'loading',
};

function mergePatch<T>(defaults: T, base: T | undefined, patch: Partial<T>): T {
  return {...defaults, ...base, ...patch};
}

/**
 * Creates the module-data slice for composing into the GraphDesignerStore.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - Project identifier bound at construction time.
 */
export function createModuleDataSlice<S extends ModuleDataSlice>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): ModuleDataSlice {
  const patchEntry = (moduleId: string, patch: Partial<ModuleDataEntry>) => {
    const existing = get().moduleDataByModuleId[moduleId];
    set({
      moduleDataByModuleId: {
        ...get().moduleDataByModuleId,
        [moduleId]: {...existing, ...patch} as ModuleDataEntry,
      },
    } as Partial<S>);
  };

  return {
    clearModuleData: (moduleId: string): void => {
      logger.debug('moduleDataSlice: clearModuleData', {
        action: 'clearModuleData',
        component: 'moduleDataSlice',
      });

      const {[moduleId]: _removed, ...remaining} = get().moduleDataByModuleId;
      set({moduleDataByModuleId: remaining} as Partial<S>);
    },

    fetchCalData: async (
      moduleId: string,
      ckvSystemId: string,
      scope: 'partial' | 'full' = 'full',
      paramSystemIds?: string[],
    ): Promise<boolean> => {
      logger.debug('moduleDataSlice: fetchCalData', {
        action: 'fetchCalData',
        component: 'moduleDataSlice',
      });

      const entry = get().moduleDataByModuleId[moduleId];
      const moduleName = entry?.moduleName ?? '';

      patchEntry(moduleId, {
        calData: mergePatch(DEFAULT_CAL_DATA, entry?.calData, {
          error: undefined,
          selectedCalIndex: ckvSystemId,
          status: 'loading',
        }),
        moduleName,
      });

      try {
        const result = await getCalData(
          projectId,
          moduleId,
          ckvSystemId,
          scope === 'partial' ? paramSystemIds : undefined,
        );

        const latest = get().moduleDataByModuleId[moduleId];
        const base = latest?.calData;

        if (!result.success || !result.data) {
          const errorMsg = result.message ?? 'Failed to fetch module data';
          logger.error('moduleDataSlice: fetchCalData — GET failed', {
            action: 'fetchCalData',
            component: 'moduleDataSlice',
            error: errorMsg,
          });
          patchEntry(moduleId, {
            calData: mergePatch(DEFAULT_CAL_DATA, base, {
              error: errorMsg,
              selectedCalIndex: ckvSystemId,
              status: 'error',
            }),
          });
          showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
          return false;
        }

        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, base, {
            dto: result.data,
            error: undefined,
            lastMutation: 'get',
            loadedScope: scope,
            selectedCalIndex: ckvSystemId,
            status: 'ready',
          }),
        });
        return true;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('moduleDataSlice: fetchCalData — thrown error', {
          action: 'fetchCalData',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        const latest = get().moduleDataByModuleId[moduleId];
        const base = latest?.calData;
        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, base, {
            error: errorMsg,
            selectedCalIndex: ckvSystemId,
            status: 'error',
          }),
        });
        showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
        return false;
      }
    },

    fetchTagData: async (
      moduleId: string,
      tagSystemId: string,
      tkvSystemId: string,
    ): Promise<boolean> => {
      logger.debug('moduleDataSlice: fetchTagData', {
        action: 'fetchTagData',
        component: 'moduleDataSlice',
      });

      const entry = get().moduleDataByModuleId[moduleId];
      const moduleName = entry?.moduleName ?? '';

      patchEntry(moduleId, {
        moduleName,
        tagData: mergePatch(DEFAULT_TAG_DATA, entry?.tagData, {
          error: undefined,
          selectedTagIndex: tkvSystemId,
          selectedTagSystemId: tagSystemId,
          status: 'loading',
        }),
      });

      try {
        const result = await getTagData(
          projectId,
          moduleId,
          tagSystemId,
          tkvSystemId,
        );

        const latest = get().moduleDataByModuleId[moduleId];
        const base = latest?.tagData;

        if (!result.success || !result.data) {
          const errorMsg = result.message ?? 'Failed to fetch module data';
          logger.error('moduleDataSlice: fetchTagData — GET failed', {
            action: 'fetchTagData',
            component: 'moduleDataSlice',
            error: errorMsg,
          });
          patchEntry(moduleId, {
            tagData: mergePatch(DEFAULT_TAG_DATA, base, {
              error: errorMsg,
              selectedTagIndex: tkvSystemId,
              selectedTagSystemId: tagSystemId,
              status: 'error',
            }),
          });
          showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
          return false;
        }

        patchEntry(moduleId, {
          tagData: mergePatch(DEFAULT_TAG_DATA, base, {
            dto: result.data,
            error: undefined,
            lastMutation: 'get',
            selectedTagIndex: tkvSystemId,
            selectedTagSystemId: tagSystemId,
            status: 'ready',
          }),
        });
        return true;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('moduleDataSlice: fetchTagData — thrown error', {
          action: 'fetchTagData',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        const latest = get().moduleDataByModuleId[moduleId];
        const base = latest?.tagData;
        patchEntry(moduleId, {
          tagData: mergePatch(DEFAULT_TAG_DATA, base, {
            error: errorMsg,
            selectedTagIndex: tkvSystemId,
            selectedTagSystemId: tagSystemId,
            status: 'error',
          }),
        });
        showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
        return false;
      }
    },

    moduleDataByModuleId: {},

    moduleOpenTabs: {},

    queryModuleData: async (
      moduleId: string,
      moduleName: string,
    ): Promise<boolean> => {
      logger.debug('moduleDataSlice: queryModuleData', {
        action: 'queryModuleData',
        component: 'moduleDataSlice',
      });

      patchEntry(moduleId, {
        calData: DEFAULT_CAL_DATA,
        moduleName,
        tagData: DEFAULT_TAG_DATA,
      });

      try {
        const result = await queryModuleIndices(projectId, moduleId);

        if (!result.success || !result.data?.length) {
          const errorMsg = result.message ?? 'Failed to query module data';
          logger.error('moduleDataSlice: queryModuleData — API error', {
            action: 'queryModuleData',
            component: 'moduleDataSlice',
            error: errorMsg,
          });
          patchEntry(moduleId, {
            calData: mergePatch(DEFAULT_CAL_DATA, undefined, {
              error: errorMsg,
              status: 'error',
            }),
            moduleName,
            tagData: mergePatch(DEFAULT_TAG_DATA, undefined, {
              error: errorMsg,
              status: 'error',
            }),
          });
          showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
          return false;
        }

        const [module] = result.data;
        const availableCalIndices = module.ckvs ?? [];
        const availableTagIndices = module.tags ?? [];

        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, undefined, {
            availableCalIndices,
            status: 'ready',
          }),
          moduleName,
          tagData: mergePatch(DEFAULT_TAG_DATA, undefined, {
            availableTagIndices,
            status: 'ready',
          }),
        });

        const [firstCkv] = availableCalIndices;
        const [firstTag] = availableTagIndices;
        const [firstTkv] = firstTag?.tkvs ?? [];

        await Promise.all([
          firstCkv
            ? get().fetchCalData(moduleId, firstCkv.systemId)
            : Promise.resolve(),
          firstTag && firstTkv
            ? get().fetchTagData(moduleId, firstTag.systemId, firstTkv.systemId)
            : Promise.resolve(),
        ]);

        return true;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('moduleDataSlice: queryModuleData — thrown error', {
          action: 'queryModuleData',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, undefined, {
            error: errorMsg,
            status: 'error',
          }),
          moduleName,
          tagData: mergePatch(DEFAULT_TAG_DATA, undefined, {
            error: errorMsg,
            status: 'error',
          }),
        });
        showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
        return false;
      }
    },

    setCalUiState: (
      moduleId: string,
      patch: Partial<GenericTreeViewUiState>,
    ): void => {
      logger.debug('moduleDataSlice: setCalUiState', {
        action: 'setCalUiState',
        component: 'moduleDataSlice',
      });
      const entry = get().moduleDataByModuleId[moduleId];
      if (!entry?.calData) {
        return;
      }
      patchEntry(moduleId, {
        calData: {
          ...entry.calData,
          uiState: {
            ...entry.calData.uiState,
            ...patch,
          } as GenericTreeViewUiState,
        },
      });
    },

    setGroupedCalUiState: (
      moduleId: string,
      patch: Partial<GenericTreeViewUiState>,
    ): void => {
      logger.debug('moduleDataSlice: setGroupedCalUiState', {
        action: 'setGroupedCalUiState',
        component: 'moduleDataSlice',
      });
      const entry = get().moduleDataByModuleId[moduleId];
      if (!entry?.calData) {
        return;
      }
      patchEntry(moduleId, {
        calData: {
          ...entry.calData,
          groupedUiState: {
            ...entry.calData.groupedUiState,
            ...patch,
          } as GenericTreeViewUiState,
        },
      });
    },

    setModuleOpenTab: (moduleId: string, tabId: string): void => {
      logger.debug('moduleDataSlice: setModuleOpenTab', {
        action: 'setModuleOpenTab',
        component: 'moduleDataSlice',
      });
      set({
        moduleOpenTabs: {
          ...get().moduleOpenTabs,
          [moduleId]: tabId,
        },
      } as Partial<S>);
    },

    setTagUiState: (
      moduleId: string,
      patch: Partial<GenericTreeViewUiState>,
    ): void => {
      logger.debug('moduleDataSlice: setTagUiState', {
        action: 'setTagUiState',
        component: 'moduleDataSlice',
      });
      const entry = get().moduleDataByModuleId[moduleId];
      if (!entry?.tagData) {
        return;
      }
      patchEntry(moduleId, {
        tagData: {
          ...entry.tagData,
          uiState: {
            ...entry.tagData.uiState,
            ...patch,
          } as GenericTreeViewUiState,
        },
      });
    },

    updateCalData: async (
      moduleId: string,
      payload: UpdateSpfModuleCalDataRequest,
    ): Promise<CalDataDto | void> => {
      logger.debug('moduleDataSlice: updateCalData', {
        action: 'updateCalData',
        component: 'moduleDataSlice',
      });

      const entry = get().moduleDataByModuleId[moduleId];
      const ckvSystemId = entry?.calData?.selectedCalIndex;

      if (!entry?.calData || !ckvSystemId) {
        showToast('No module data loaded for this module', 'danger');
        return;
      }

      try {
        const result = await putCalData(
          projectId,
          moduleId,
          ckvSystemId,
          payload,
        );

        if (result.success && result.data) {
          const latest = get().moduleDataByModuleId[moduleId];
          if (latest?.calData?.dto) {
            const mergedDto = mergeParametersById(
              latest.calData.dto,
              result.data,
            );
            patchEntry(moduleId, {
              calData: {
                ...latest.calData,
                dto: mergedDto,
                lastMutation: 'set',
                status: 'ready',
              },
            });
            return mergedDto;
          }
          return result.data;
        }

        const errorMsg = result.message ?? 'Failed to save module data';
        showToast(errorMsg, 'danger');
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to save module data';
        logger.error('moduleDataSlice: updateCalData — thrown error', {
          action: 'updateCalData',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        showToast(errorMsg, 'danger');
      }
    },

    updateTagData: async (
      moduleId: string,
      payload: UpdateSpfModuleTagDataRequest,
    ): Promise<TagDataDto | void> => {
      logger.debug('moduleDataSlice: updateTagData', {
        action: 'updateTagData',
        component: 'moduleDataSlice',
      });

      const entry = get().moduleDataByModuleId[moduleId];
      const tagSystemId = entry?.tagData?.selectedTagSystemId;
      const tkvSystemId = entry?.tagData?.selectedTagIndex;

      if (!entry?.tagData || !tagSystemId || !tkvSystemId) {
        showToast('No module data loaded for this module', 'danger');
        return;
      }

      try {
        const result = await putTagData(
          projectId,
          moduleId,
          tagSystemId,
          tkvSystemId,
          payload,
        );

        if (result.success && result.data) {
          const latest = get().moduleDataByModuleId[moduleId];
          if (latest?.tagData?.dto) {
            const mergedDto = mergeParametersById(
              latest.tagData.dto,
              result.data,
            );
            patchEntry(moduleId, {
              tagData: {
                ...latest.tagData,
                dto: mergedDto,
                lastMutation: 'set',
                status: 'ready',
              },
            });
            return mergedDto;
          }
          return result.data;
        }

        const errorMsg = result.message ?? 'Failed to save module data';
        showToast(errorMsg, 'danger');
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to save module data';
        logger.error('moduleDataSlice: updateTagData — thrown error', {
          action: 'updateTagData',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        showToast(errorMsg, 'danger');
      }
    },
  };
}
