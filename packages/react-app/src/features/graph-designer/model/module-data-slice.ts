/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  type CalDataDto,
  type ChangeInfoDto,
  type CkvDto,
  type ConfigElementDto,
  getCalData,
  getTagData,
  type NameValuePairDto,
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
import {createDefaultTreeViewUiState} from '~shared/lib/tree-view-ui-state';
import type {SliceStatus} from '~shared/store/global-store.types';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

import {resolveEnableParamSystemId} from '../lib/module-enable.constants';
import {resolveActiveCkv} from '../lib/resolve-active-ckv';
import {toUserFriendlyError} from '../lib/to-user-friendly-error';

import type {GraphDataSlice} from './graph-data-slice';
import type {ModuleListSlice} from './module-list-slice';
import type {SubgraphHeaderSelectionSlice} from './subgraph-header-selection-slice';

export interface ModuleDataEntry {
  calData?: {
    availableCalIndices: CkvDto[];
    dto?: CalDataDto;
    error?: string;
    groupedUiState?: GenericTreeViewUiState;
    /** True while a Set request is in flight — blocks a second Set. */
    isSaving?: boolean;
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
    /** True while a Set request is in flight — blocks a second Set. */
    isSaving?: boolean;
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
  moduleOpenTabs: Record<string, string | null>;
  queryModuleData: (moduleId: string, moduleName: string) => Promise<boolean>;
  setCalUiState: (
    moduleId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  setGroupedCalUiState: (
    moduleId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  setModuleEnable: (moduleInstanceId: string, value: boolean) => Promise<void>;
  setModuleOpenTab: (moduleId: string, tabId: string | null) => void;
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

function enableValueToConfigElement(
  element: ConfigElementDto,
  value: boolean,
): ConfigElementDto {
  const targetName = value ? 'enable' : 'disable';
  const allowedValue = element.allowedValues?.find(
    (candidate): candidate is NameValuePairDto =>
      candidate.type === 'NAME_VALUE_PAIR' &&
      candidate.name.toLowerCase() === targetName,
  );
  return allowedValue ? {...element, value: allowedValue.value} : element;
}

/**
 * Creates the module-data slice for composing into the GraphDesignerStore.
 *
 * @remarks The store type `S` must also compose `GraphDataSlice`,
 * `ModuleListSlice`, and `SubgraphHeaderSelectionSlice` — `setModuleEnable`
 * reads a module instance's CKVs and its subgraph's header selection to
 * resolve the active CKV, and reads `moduleDefinitionsById` to resolve the
 * enable parameter's systemId, before writing the enable parameter.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - Project identifier bound at construction time.
 */
export function createModuleDataSlice<
  S extends ModuleDataSlice &
    GraphDataSlice &
    ModuleListSlice &
    SubgraphHeaderSelectionSlice,
>(
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

      const entry = get().moduleDataByModuleId[moduleId];
      patchEntry(moduleId, {
        calData: mergePatch(DEFAULT_CAL_DATA, entry?.calData, {
          error: undefined,
          status: 'loading',
        }),
        moduleName,
        tagData: mergePatch(DEFAULT_TAG_DATA, entry?.tagData, {
          error: undefined,
          status: 'loading',
        }),
      });

      try {
        const result = await queryModuleIndices(projectId, moduleId);

        if (!result.success) {
          const errorMsg = result.message ?? 'Failed to query module data';
          logger.error('moduleDataSlice: queryModuleData — API error', {
            action: 'queryModuleData',
            component: 'moduleDataSlice',
            error: errorMsg,
          });
          const latest = get().moduleDataByModuleId[moduleId];
          patchEntry(moduleId, {
            calData: mergePatch(DEFAULT_CAL_DATA, latest?.calData, {
              error: errorMsg,
              status: 'error',
            }),
            moduleName,
            tagData: mergePatch(DEFAULT_TAG_DATA, latest?.tagData, {
              error: errorMsg,
              status: 'error',
            }),
          });
          showToast(toUserFriendlyError(errorMsg, moduleName), 'danger');
          return false;
        }

        if (!result.data?.length) {
          logger.debug('moduleDataSlice: queryModuleData — no indices', {
            action: 'queryModuleData',
            component: 'moduleDataSlice',
          });
          const latest = get().moduleDataByModuleId[moduleId];
          patchEntry(moduleId, {
            calData: mergePatch(DEFAULT_CAL_DATA, latest?.calData, {
              availableCalIndices: [],
              dto: undefined,
              selectedCalIndex: undefined,
              status: 'ready',
            }),
            moduleName,
            tagData: mergePatch(DEFAULT_TAG_DATA, latest?.tagData, {
              availableTagIndices: [],
              dto: undefined,
              selectedTagIndex: undefined,
              selectedTagSystemId: undefined,
              status: 'ready',
            }),
          });
          showToast(
            `No calibration or tag data available for ${moduleName}`,
            'warning',
          );
          return true;
        }

        const [module] = result.data;
        const availableCalIndices = module.ckvs ?? [];
        const availableTagIndices = module.tags ?? [];

        const latest = get().moduleDataByModuleId[moduleId];
        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, latest?.calData, {
            availableCalIndices,
            status: 'ready',
          }),
          moduleName,
          tagData: mergePatch(DEFAULT_TAG_DATA, latest?.tagData, {
            availableTagIndices,
            status: 'ready',
          }),
        });

        const moduleInstance = get().graphData?.moduleInstances[moduleId];
        const headerSelection = moduleInstance
          ? get().headerSelectionsBySubgraphId[moduleInstance.subgraphId]
          : undefined;
        const activeCkv = resolveActiveCkv(
          moduleInstance?.ckvs ?? [],
          headerSelection?.keyValues ?? {},
        );

        const [firstTag] = availableTagIndices;
        const [firstTkv] = firstTag?.tkvs ?? [];

        await Promise.all([
          activeCkv.isResolved
            ? get().fetchCalData(moduleId, activeCkv.ckvSystemId)
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
        const latest = get().moduleDataByModuleId[moduleId];
        patchEntry(moduleId, {
          calData: mergePatch(DEFAULT_CAL_DATA, latest?.calData, {
            error: errorMsg,
            status: 'error',
          }),
          moduleName,
          tagData: mergePatch(DEFAULT_TAG_DATA, latest?.tagData, {
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
            ...createDefaultTreeViewUiState(),
            ...entry.calData.uiState,
            ...patch,
          },
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
            ...createDefaultTreeViewUiState(),
            ...entry.calData.groupedUiState,
            ...patch,
          },
        },
      });
    },

    setModuleEnable: async (
      moduleInstanceId: string,
      value: boolean,
    ): Promise<void> => {
      logger.debug('moduleDataSlice: setModuleEnable', {
        action: 'setModuleEnable',
        component: 'moduleDataSlice',
      });

      const moduleInstance = get().graphData?.moduleInstances[moduleInstanceId];
      const headerSelection = moduleInstance
        ? get().headerSelectionsBySubgraphId[moduleInstance.subgraphId]
        : undefined;
      const activeCkv = resolveActiveCkv(
        moduleInstance?.ckvs ?? [],
        headerSelection?.keyValues ?? {},
      );
      if (!activeCkv.isResolved) {
        return;
      }

      const entry = get().moduleDataByModuleId[moduleInstanceId];
      if (entry?.calData?.selectedCalIndex !== activeCkv.ckvSystemId) {
        return;
      }
      if (entry.calData.isSaving) {
        return;
      }

      const moduleDefinition = moduleInstance
        ? get().moduleDefinitionsById[moduleInstance.moduleId]
        : undefined;
      const enableSystemId = resolveEnableParamSystemId(moduleDefinition);

      const dto = entry.calData.dto;
      const enableParameter = dto?.parameters.find(
        (param) => param.systemId === enableSystemId,
      );
      const enableElement = enableParameter?.elements[0];
      if (
        !enableSystemId ||
        !dto ||
        !enableParameter ||
        enableElement?.type !== 'CONFIG_ELEMENT'
      ) {
        return;
      }

      const payload: UpdateSpfModuleCalDataRequest = {
        data: [
          {
            ...enableParameter,
            changeInfo: {changeType: 'UPDATE'},
            elements: [enableValueToConfigElement(enableElement, value)],
          },
        ],
      };

      patchEntry(moduleInstanceId, {
        calData: {...entry.calData, isSaving: true},
      });

      try {
        const result = await putCalData(
          projectId,
          moduleInstanceId,
          activeCkv.ckvSystemId,
          payload,
          [enableSystemId],
        );

        if (result.success && result.data) {
          const latest = get().moduleDataByModuleId[moduleInstanceId];
          const latestDto = latest?.calData?.dto;
          // Only merge if this save is still the current one — a later
          // call may have already completed and cleared isSaving, in
          // which case this response is stale and must not clobber it.
          if (latest?.calData?.isSaving && latestDto) {
            patchEntry(moduleInstanceId, {
              calData: {
                ...latest.calData,
                dto: mergeParametersById(latestDto, result.data),
                lastMutation: 'set',
                status: 'ready',
              },
            });
          }
          return;
        }

        showToast(result.message ?? 'Failed to save module data', 'danger');
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to save module data';
        logger.error('moduleDataSlice: setModuleEnable — thrown error', {
          action: 'setModuleEnable',
          component: 'moduleDataSlice',
          error: errorMsg,
        });
        showToast(errorMsg, 'danger');
      } finally {
        const latest = get().moduleDataByModuleId[moduleInstanceId];
        if (latest?.calData) {
          patchEntry(moduleInstanceId, {
            calData: {...latest.calData, isSaving: false},
          });
        }
      }
    },

    setModuleOpenTab: (moduleId: string, tabId: string | null): void => {
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
            ...createDefaultTreeViewUiState(),
            ...entry.tagData.uiState,
            ...patch,
          },
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
      if (entry.calData.isSaving) {
        return;
      }

      patchEntry(moduleId, {
        calData: {...entry.calData, isSaving: true},
      });

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
      } finally {
        const latest = get().moduleDataByModuleId[moduleId];
        if (latest?.calData) {
          patchEntry(moduleId, {
            calData: {...latest.calData, isSaving: false},
          });
        }
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
      if (entry.tagData.isSaving) {
        return;
      }

      patchEntry(moduleId, {
        tagData: {...entry.tagData, isSaving: true},
      });

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
      } finally {
        const latest = get().moduleDataByModuleId[moduleId];
        if (latest?.tagData) {
          patchEntry(moduleId, {
            tagData: {...latest.tagData, isSaving: false},
          });
        }
      }
    },
  };
}
