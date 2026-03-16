/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';
import {logger} from '~shared/lib/logger';

import type {ModuleListStore} from './module-list-types';

export const useModuleListStore = create<ModuleListStore>((set) => ({
  isDragEnabled: false,
  moduleList: [],
  query: '',
  selectedDspTypes: [],
  selectedModuleTypes: [],

  setDragEnabled: (enabled: boolean) => {
    try {
      set({isDragEnabled: enabled});
      return true;
    } catch (error) {
      logger.error(`Failed to set drag enabled state: ${String(error)}`);
      return false;
    }
  },

  setModuleList: (moduleList: SpfModuleDefinitionResponseDto[]) => {
    try {
      set({moduleList});
      return true;
    } catch (error) {
      logger.error(`Failed to set module list: ${String(error)}`);
      return false;
    }
  },

  setSearchString: (query: string) => {
    try {
      set({query});
      return true;
    } catch (error) {
      logger.error(`Failed to set query: ${String(error)}`);
      return false;
    }
  },

  setSelectedDspTypes: (types: string[]) => {
    try {
      set({selectedDspTypes: types});
      return true;
    } catch (error) {
      logger.error(`Failed to set selected DSP types: ${String(error)}`);
      return false;
    }
  },

  setSelectedModuleTypes: (types: string[]) => {
    try {
      set({selectedModuleTypes: types});
      return true;
    } catch (error) {
      logger.error(`Failed to set selected module types: ${String(error)}`);
      return false;
    }
  },
}));
