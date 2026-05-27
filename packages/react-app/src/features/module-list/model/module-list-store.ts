/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';

import type {ModuleListStore} from './module-list-types';

export const useModuleListStore = create<ModuleListStore>((set) => ({
  isDragEnabled: false,
  moduleList: [],
  projectFilters: {},
  query: '',
  selectedDspTypes: [],
  selectedModuleTypes: [],

  setDragEnabled: (enabled: boolean) => {
    set({isDragEnabled: enabled});
  },

  setModuleList: (moduleList: SpfModuleDefinitionResponseDto[]) => {
    set({moduleList});
  },

  setSearchString: (query: string) => {
    set({query});
  },

  setSelectedDspTypes: (types: string[]) => {
    set({selectedDspTypes: types});
  },

  setSelectedModuleTypes: (types: string[]) => {
    set({selectedModuleTypes: types});
  },
}));
