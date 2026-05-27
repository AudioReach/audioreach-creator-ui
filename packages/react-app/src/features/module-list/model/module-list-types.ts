/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';

// Interface for dragged module information
export interface DraggedModuleInfo {
  dspType: string; // DSP Type (ADSP, MDSP, CDSP)
  moduleId: string;
}

// Store interface
export interface ModuleListStore {
  // Controls whether modules can be dragged
  isDragEnabled: boolean;

  // Stores the module definitions from backend
  moduleList: SpfModuleDefinitionResponseDto[];

  // Per-project filter storage
  projectFilters: Record<
    string,
    {dspFilter: string[]; moduleTypeFilter: string[]}
  >;
  // Stores the current search text
  query: string;

  // Dynamic filter state - stores selected DSP and Module types
  selectedDspTypes: string[];

  selectedModuleTypes: string[];

  setDragEnabled: (enabled: boolean) => void;
  setModuleList: (moduleList: SpfModuleDefinitionResponseDto[]) => void;

  setSearchString: (query: string) => void;

  setSelectedDspTypes: (types: string[]) => void;
  setSelectedModuleTypes: (types: string[]) => void;
}
