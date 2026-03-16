/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ReactElement, useEffect, useMemo} from 'react';

import {Box, Boxes, Check, ListFilter, Search} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Popover} from '@qualcomm-ui/react/popover';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {getAllSpfModuleDefinitions} from '~entities/module-definitions/api/module-definition-api';
import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';
import {useModuleListStore} from '~features/module-list/model/module-list-store';
import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';

/**
 * Dispatch a custom event safely
 */
function dispatchCustomEvent(eventName: string, detail?: unknown): void {
  if ('window' in globalThis && globalThis.dispatchEvent) {
    const event = new Event(eventName);
    Object.defineProperty(event, 'detail', {
      value: detail,
      writable: false,
    });
    globalThis.dispatchEvent(event);
  }
}

/**
 * Handle drag start event for modules
 */
function handleDragStart(
  module: SpfModuleDefinitionResponseDto,
  event: React.DragEvent,
): void {
  const draggedModuleInfo = {
    dspType: module.processorInfo.name,
    moduleId: module.moduleId,
  };

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify(draggedModuleInfo),
  );
  event.dataTransfer.effectAllowed = 'copy';
  dispatchCustomEvent('module-drag-start', draggedModuleInfo);
  logger.info('Module drag started');
}

/**
 * Get DSP type from module (e.g., ADSP, MDSP, CDSP)
 */
function getDspType(module: SpfModuleDefinitionResponseDto): string {
  return module.processorInfo.name;
}

/**
 * Get module type from module (e.g., Decoder, Encoder, Sink)
 */
function getModuleType(module: SpfModuleDefinitionResponseDto): string {
  return module.moduleInfo.moduleTypeInfo.majorModuleType || 'Unknown';
}

/**
 * Convert module ID to all searchable formats (decimal, hex, 0x-prefixed hex)
 * This allows users to search by module ID in any format
 * @param id - The module ID (can be string or number)
 * @returns Space-separated string of all ID representations for searching
 */
function convertModuleIdToSearchableFormats(
  id: string | number | undefined,
): string {
  if (id == null) {
    return '';
  }

  const str = String(id).trim();
  const formats = new Set<string>();

  // Always add the original string representation
  formats.add(str.toLowerCase());

  // If it's a pure decimal number, add hex representations
  if (/^\d+$/.test(str)) {
    const decimal = parseInt(str, 10);
    if (!isNaN(decimal)) {
      const hex = decimal.toString(16);
      formats.add(decimal.toString(10));
      formats.add(hex.toLowerCase());
      formats.add(`0x${hex.toLowerCase()}`);
    }
  }

  return Array.from(formats).join(' ');
}

// Module-level variable to track initialization (persists across component remounts)
let didInitialize = false;

export function ModuleList(): ReactElement {
  // Get the active project ID from the project layout store
  const activeProjectGroup = useProjectLayoutStore((state) =>
    state.getActiveProjectGroup(),
  );

  // Use projectKey as the project ID (this is the unique identifier for the project)
  const projectId = activeProjectGroup?.projectKey;

  // Load module list data from API
  useEffect(() => {
    // Only fetch if we have a valid project ID
    if (!projectId || projectId === 'project_undefined') {
      logger.info('[ModuleList] No valid project ID, skipping fetch');
      return;
    }

    const loadModuleList = async () => {
      logger.info(
        `[ModuleList] Fetching module list for project: ${projectId}`,
      );
      const result = await getAllSpfModuleDefinitions(projectId);

      if (result.success && result.data) {
        logger.info(
          `[ModuleList] Successfully fetched ${result.data.length} modules`,
        );

        // Get store action
        const {setModuleList} = useModuleListStore.getState();

        // Set all modules at once
        setModuleList(result.data);

        logger.info('[ModuleList] Module list loaded successfully');
      } else {
        logger.error(
          `[ModuleList] ${result.message || 'Failed to load module list'}`,
        );
      }
    };

    void loadModuleList();
  }, [projectId]);

  const moduleList = useModuleListStore((state) => state.moduleList);
  const query = useModuleListStore((state) => state.query);
  const setSearchString = useModuleListStore((state) => state.setSearchString);
  const isDragEnabled = useModuleListStore((state) => state.isDragEnabled);
  const selectedDspTypes = useModuleListStore(
    (state) => state.selectedDspTypes,
  );
  const selectedModuleTypes = useModuleListStore(
    (state) => state.selectedModuleTypes,
  );
  const setSelectedDspTypes = useModuleListStore(
    (state) => state.setSelectedDspTypes,
  );
  const setSelectedModuleTypes = useModuleListStore(
    (state) => state.setSelectedModuleTypes,
  );

  // Extract unique DSP types from data (checkboxes)
  const uniqueDspTypes = useMemo(() => {
    const types = new Set<string>();
    moduleList.forEach((module) => {
      types.add(module.processorInfo.name);
    });
    return Array.from(types).sort();
  }, [moduleList]);

  // Extract unique Module types from data (checkboxes)
  const uniqueModuleTypes = useMemo(() => {
    const types = new Set<string>();
    moduleList.forEach((module) => {
      types.add(module.moduleInfo.moduleTypeInfo.majorModuleType);
    });
    return Array.from(types).sort();
  }, [moduleList]);

  // Filter modules based on selected types in checkbox and search query
  const filteredModules = useMemo(() => {
    let result = moduleList;

    // If nothing is selected in DSP types, show nothing
    if (selectedDspTypes.length === 0) {
      return [];
    }

    // If nothing is selected in Module types, show nothing
    if (selectedModuleTypes.length === 0) {
      return [];
    }

    // Apply DSP type filter
    result = result.filter((module) =>
      selectedDspTypes.includes(module.processorInfo.name),
    );

    // Apply Module type filter
    result = result.filter((module) =>
      selectedModuleTypes.includes(
        module.moduleInfo.moduleTypeInfo.majorModuleType,
      ),
    );

    // Apply search filter(filters the module list based on what the user types in the search box)
    if (query) {
      const searchLower = query.toLowerCase();
      result = result.filter((module) => {
        const name = (module.name || '').toLowerCase();
        const displayName = (module.displayName || '').toLowerCase();
        const moduleId = convertModuleIdToSearchableFormats(
          module.moduleId,
        ).toLowerCase();

        return (
          name.includes(searchLower) ||
          displayName.includes(searchLower) ||
          moduleId.includes(searchLower)
        );
      });
    }

    return result;
  }, [moduleList, query, selectedDspTypes, selectedModuleTypes]);

  // Handle DSP type checkbox toggle
  const handleDspTypeToggle = (dspType: string, checked: boolean) => {
    if (checked) {
      setSelectedDspTypes([...selectedDspTypes, dspType]);
    } else {
      setSelectedDspTypes(selectedDspTypes.filter((t) => t !== dspType));
    }
  };

  // Handle Module type checkbox toggle
  const handleModuleTypeToggle = (moduleType: string, checked: boolean) => {
    if (checked) {
      setSelectedModuleTypes([...selectedModuleTypes, moduleType]);
    } else {
      setSelectedModuleTypes(
        selectedModuleTypes.filter((t) => t !== moduleType),
      );
    }
  };

  // Clear All - Select all checkboxes (clears filters, shows all)
  const handleClearAll = () => {
    setSelectedDspTypes(uniqueDspTypes);
    setSelectedModuleTypes(uniqueModuleTypes);
  };

  // Unselect All - Uncheck all checkboxes (hides all)
  const handleUnselectAll = () => {
    setSelectedDspTypes([]);
    setSelectedModuleTypes([]);
  };

  // Initialize all types as selected only on first load (when moduleList changes from empty to populated)
  useEffect(() => {
    if (didInitialize) {
      return;
    }
    if (moduleList.length === 0) {
      return;
    }

    didInitialize = true;

    setSelectedDspTypes(uniqueDspTypes);
    setSelectedModuleTypes(uniqueModuleTypes);
  });

  // Show filter only if there are meaningful choices to make
  // Hide when there's only 1 DSP type AND 1 Module type (nothing to filter)
  const showFilterIcon =
    uniqueDspTypes.length > 1 || uniqueModuleTypes.length > 1;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TextInput
          aria-label="Search modules"
          onValueChange={setSearchString}
          placeholder="Search"
          size="sm"
          startIcon={Search}
          value={query}
        />
        {showFilterIcon && (
          <Tooltip
            trigger={
              <span>
                <Popover
                  trigger={
                    <InlineIconButton
                      aria-label="Filter options"
                      icon={ListFilter}
                      size="md"
                    />
                  }
                >
                  <div className="-m-2 flex w-40 flex-col">
                    {/* DSP Type Section */}
                    <div className="px-1.5 pb-1">
                      <h3 className="text-[11px] font-semibold">DSP Type</h3>
                      <div className="flex flex-col">
                        {uniqueDspTypes.map((dspType) => (
                          <button
                            key={dspType}
                            className="hover:bg-neutral-hover flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left text-[10px]"
                            onClick={() =>
                              handleDspTypeToggle(
                                dspType,
                                !selectedDspTypes.includes(dspType),
                              )
                            }
                          >
                            <Check
                              className={`h-3 w-3 shrink-0 ${
                                selectedDspTypes.includes(dspType)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            />
                            {dspType}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-neutral-border my-0.5 border-t" />

                    {/* Module Type Section */}
                    <div className="px-1.5 pb-1">
                      <h3 className="mb-0.5 text-[11px] font-semibold">
                        Module Type
                      </h3>
                      <div className="flex flex-col">
                        {uniqueModuleTypes.map((moduleType) => (
                          <button
                            key={moduleType}
                            className="hover:bg-neutral-hover flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left text-[10px]"
                            onClick={() =>
                              handleModuleTypeToggle(
                                moduleType,
                                !selectedModuleTypes.includes(moduleType),
                              )
                            }
                          >
                            <Check
                              className={`h-3 w-3 shrink-0 ${
                                selectedModuleTypes.includes(moduleType)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            />
                            {moduleType}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-neutral-border my-0.5 border-t" />

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-0.5 px-0.5">
                      <Button
                        className="whitespace-nowrap text-[10px]"
                        emphasis="neutral"
                        onClick={handleClearAll}
                        size="sm"
                        variant="ghost"
                      >
                        Clear All
                      </Button>
                      <Button
                        className="whitespace-nowrap text-[10px]"
                        emphasis="neutral"
                        onClick={handleUnselectAll}
                        size="sm"
                        variant="ghost"
                      >
                        Unselect All
                      </Button>
                    </div>
                  </div>
                </Popover>
              </span>
            }
          >
            Filter Options
          </Tooltip>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {filteredModules.map((module) => (
          <Tooltip
            key={module.systemId}
            trigger={
              <li
                className={`flex items-center gap-3 ${isDragEnabled ? 'cursor-grab' : 'cursor-default'}`}
                draggable={isDragEnabled}
                onDragStart={(e) => handleDragStart(module, e)}
              >
                {module.builtIn ? (
                  <Box className="h-4 w-4 shrink-0" />
                ) : (
                  <Boxes className="h-4 w-4 shrink-0" />
                )}
                <div className="flex flex-col gap-0">
                  <span className="text-[11px] font-semibold">
                    {module.displayName || module.name}
                  </span>
                  <span className="text-neutral-secondary text-[10px]">
                    {getDspType(module)} • {getModuleType(module)}
                  </span>
                </div>
              </li>
            }
          >
            {module.description || 'Unknown'}
          </Tooltip>
        ))}
      </ul>
    </div>
  );
}
