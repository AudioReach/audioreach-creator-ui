/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {getAllSpfModuleDefinitions} from '~entities/module-definitions/api/module-definition-api';
import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Port {
  direction: 'input' | 'output';
  isStatic: boolean;
  portId: string;
  portName: string;
  portType: 'audio' | 'control' | 'data';
}

export interface ModuleDefinition {
  builtIn: boolean;
  category: string;
  description: string;
  /** DSP processor type, sourced from dto.processorInfo.name */
  dspType: string;
  inputPorts: Port[];
  moduleId: string;
  moduleName: string;
  moduleType: string;
  outputPorts: Port[];
}

export interface ModuleListSlice {
  loadModuleList: () => Promise<void>;
  moduleList: ModuleDefinition[];
  moduleListSearchQuery: string;
  moduleListStatus: SliceStatus;
  selectedDspTypes: string[];
  selectedModuleTypes: string[];
  setModuleListSearchQuery: (query: string) => void;
  setSelectedDspTypes: (types: string[]) => void;
  setSelectedModuleTypes: (types: string[]) => void;
}

type SetState<T> = StoreApi<T>['setState'];
type GetState<T> = StoreApi<T>['getState'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Module-level filter cache: projectId → user-selected filter state.
// Lives outside the slice so filter choices survive tab store recreation
// (e.g. when a project is closed and reopened in the same app session).
const filterCache = new Map<
  string,
  Partial<{dspTypes: string[]; moduleTypes: string[]}>
>();

export function evictModuleListFilterCache(projectId: string): void {
  filterCache.delete(projectId);
}

function toModuleDefinition(
  dto: SpfModuleDefinitionResponseDto,
): ModuleDefinition {
  const info = dto.moduleInfo;

  const inputPorts: Port[] = (info.inputDataPortInfo?.ports ?? []).map((p) => ({
    direction: 'input' as const,
    isStatic: true,
    portId: String(p.portId),
    portName: p.portName,
    portType: 'data' as const,
  }));

  const outputPorts: Port[] = (info.outputDataPortInfo?.ports ?? []).map(
    (p) => ({
      direction: 'output' as const,
      isStatic: true,
      portId: String(p.portId),
      portName: p.portName,
      portType: 'data' as const,
    }),
  );

  if (info.staticCtrlPorts?.portId) {
    inputPorts.push({
      direction: 'input',
      isStatic: true,
      portId: String(info.staticCtrlPorts.portId),
      portName: info.staticCtrlPorts.portName,
      portType: 'control',
    });
  }

  return {
    builtIn: dto.builtIn,
    category: info.moduleTypeInfo?.majorModuleType ?? '',
    description: dto.description,
    dspType: dto.processorInfo?.name ?? '',
    inputPorts,
    moduleId: String(dto.moduleId),
    moduleName: dto.name,
    moduleType: dto.moduleDirectionType,
    outputPorts,
  };
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the module-list slice for composing into a tab store.
 *
 * The slice starts `'uninitialized'` and loads lazily when the palette is
 * first opened. Both GraphDesignerStore and DiffMergeStore (graph-data edit
 * mode) include this slice.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param _get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the module-list slice.
 */
export function createModuleListSlice<S extends ModuleListSlice>(
  set: SetState<S>,
  _get: GetState<S>,
  projectId: string,
): ModuleListSlice {
  const setSlice = set as SetState<ModuleListSlice>;
  const patchFilterCache = (
    patch: Partial<{dspTypes: string[]; moduleTypes: string[]}>,
  ) => {
    filterCache.set(projectId, {
      ...(filterCache.get(projectId) ?? {}),
      ...patch,
    });
  };
  return {
    loadModuleList: async () => {
      logger.debug('moduleListSlice: loadModuleList — starting', {
        action: 'load_module_list',
        component: 'moduleListSlice',
      });

      setSlice({moduleListStatus: 'loading'});

      try {
        const result = await getAllSpfModuleDefinitions(projectId);

        if (!result.success || !result.data) {
          logger.error('moduleListSlice: loadModuleList — API error', {
            action: 'load_module_list',
            component: 'moduleListSlice',
            error: result.message,
          });
          setSlice({moduleListStatus: 'error'});
          return;
        }

        const modules = result.data.map(toModuleDefinition);
        const dspTypeSet = new Set<string>();
        const categorySet = new Set<string>();
        for (const m of modules) {
          if (m.dspType) {
            dspTypeSet.add(m.dspType);
          }
          if (m.category) {
            categorySet.add(m.category);
          }
        }

        const allDspTypes = [...dspTypeSet].sort();
        const allModuleTypes = [...categorySet].sort();
        const cached = filterCache.get(projectId);

        setSlice({
          moduleList: modules,
          moduleListStatus: 'ready',
          selectedDspTypes: cached?.dspTypes ?? allDspTypes,
          selectedModuleTypes: cached?.moduleTypes ?? allModuleTypes,
        });

        logger.debug('moduleListSlice: loadModuleList — ready', {
          action: 'load_module_list',
          component: 'moduleListSlice',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        logger.error('moduleListSlice: loadModuleList — failed', {
          action: 'load_module_list',
          component: 'moduleListSlice',
          error: message,
        });

        setSlice({moduleListStatus: 'error'});
      }
    },

    moduleList: [],

    moduleListSearchQuery: '',

    moduleListStatus: 'uninitialized',

    selectedDspTypes: [],

    selectedModuleTypes: [],

    setModuleListSearchQuery: (query: string) => {
      logger.debug('moduleListSlice: setModuleListSearchQuery', {
        action: 'set_module_list_search_query',
        component: 'moduleListSlice',
      });
      setSlice({moduleListSearchQuery: query});
    },

    setSelectedDspTypes: (types: string[]) => {
      patchFilterCache({dspTypes: types});
      setSlice({selectedDspTypes: types});
    },

    setSelectedModuleTypes: (types: string[]) => {
      patchFilterCache({moduleTypes: types});
      setSlice({selectedModuleTypes: types});
    },
  };
}
