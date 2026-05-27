/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ReactElement, useEffect, useMemo, useState} from 'react';

import {Box, Boxes, Check, ListFilter, Search} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Popover} from '@qualcomm-ui/react/popover';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {getAllSpfModuleDefinitions} from '~entities/module-definitions/api/module-definition-api';
import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';
import {useModuleListStore} from '~features/module-list/model/module-list-store';
import {isValidProjectId} from '~shared/config/utils';
import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';
import {searchItems} from '~shared/utils/search-utils';

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
  logger.info('Module drag started');
}

export function ModuleList(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  // Get the active project ID from the project layout store
  const activeProjectGroup = useProjectLayoutStore((state) =>
    state.getActiveProjectGroup(),
  );

  // Use projectKey as the project ID (this is the unique identifier for the project)
  const projectId = activeProjectGroup?.projectKey;

  // Load module list data from API
  useEffect(() => {
    // Only fetch if we have a valid project ID
    if (!isValidProjectId(projectId)) {
      logger.info('[ModuleList] No valid project ID, skipping fetch');
      setIsLoading(false);
      return;
    }

    const loadModuleList = async () => {
      setIsLoading(true);
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

      setIsLoading(false);
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

    // Apply search filter
    if (query) {
      result = searchItems(result, query);
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

  // Clear Filters - Select all checkboxes (clears filters, shows all)
  const handleClearFilters = () => {
    setSelectedDspTypes(uniqueDspTypes);
    setSelectedModuleTypes(uniqueModuleTypes);
  };

  // Unselect All - Uncheck all checkboxes (hides all)
  const handleUnselectAll = () => {
    setSelectedDspTypes([]);
    setSelectedModuleTypes([]);
  };

  // Restore or initialize filters when project/data changes
  useEffect(() => {
    if (!projectId || moduleList.length === 0) {
      return;
    }

    const store = useModuleListStore.getState();
    const savedProjectFilters = store.projectFilters[projectId];

    if (savedProjectFilters) {
      setSelectedDspTypes(savedProjectFilters.dspFilter);
      setSelectedModuleTypes(savedProjectFilters.moduleTypeFilter);
    } else {
      // No saved filters - select all (default state)
      setSelectedDspTypes(uniqueDspTypes);
      setSelectedModuleTypes(uniqueModuleTypes);
    }
  }, [
    projectId,
    moduleList.length,
    uniqueDspTypes,
    uniqueModuleTypes,
    setSelectedDspTypes,
    setSelectedModuleTypes,
  ]);

  // Auto-save filters when they change
  useEffect(() => {
    if (!projectId) {
      return;
    }

    const store = useModuleListStore.getState();
    store.projectFilters[projectId] = {
      dspFilter: selectedDspTypes,
      moduleTypeFilter: selectedModuleTypes,
    };
  }, [projectId, selectedDspTypes, selectedModuleTypes]);

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
          <Popover
            trigger={
              <span>
                <Tooltip
                  trigger={
                    <InlineIconButton
                      aria-label="Filter options"
                      icon={ListFilter}
                      size="md"
                    />
                  }
                >
                  Filter Options
                </Tooltip>
              </span>
            }
          >
            <div className="-m-2 flex w-40 flex-col">
              {/* DSP Type Section */}
              <div className="px-1.5 pb-1">
                <h3 className="text-[11px] font-semibold">DSP Type</h3>
                <div className="flex flex-col">
                  {uniqueDspTypes.map((dspType) => (
                    <div
                      key={dspType}
                      aria-checked={selectedDspTypes.includes(dspType)}
                      className="flex w-full items-center gap-1 px-1 py-0.5"
                      onClick={() =>
                        handleDspTypeToggle(
                          dspType,
                          !selectedDspTypes.includes(dspType),
                        )
                      }
                      role="checkbox"
                    >
                      <InlineIconButton
                        aria-label={`Toggle ${dspType}`}
                        className={
                          selectedDspTypes.includes(dspType)
                            ? 'opacity-100'
                            : 'opacity-0'
                        }
                        icon={Check}
                        size="sm"
                      />
                      <span className="text-[10px]">
                        {dspType.toLowerCase()}
                      </span>
                    </div>
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
                    <div
                      key={moduleType}
                      aria-checked={selectedModuleTypes.includes(moduleType)}
                      className="flex w-full items-center gap-1 px-1 py-0.5"
                      onClick={() =>
                        handleModuleTypeToggle(
                          moduleType,
                          !selectedModuleTypes.includes(moduleType),
                        )
                      }
                      role="checkbox"
                    >
                      <InlineIconButton
                        aria-label={`Toggle ${moduleType}`}
                        className={
                          selectedModuleTypes.includes(moduleType)
                            ? 'opacity-100'
                            : 'opacity-0'
                        }
                        icon={Check}
                        size="sm"
                      />
                      <span className="text-[10px]">
                        {moduleType.toLowerCase()}
                      </span>
                    </div>
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
                  onClick={handleClearFilters}
                  size="sm"
                  variant="ghost"
                >
                  Clear Filters
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
        )}
      </div>

      {isLoading ? (
        <div className="text-neutral-secondary flex items-center justify-center py-8 text-[11px]">
          Loading modules...
        </div>
      ) : (
        <>
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
                        {module.processorInfo?.name || 'Unknown'} •{' '}
                        {module.moduleInfo?.moduleTypeInfo?.majorModuleType ||
                          'Unknown'}
                      </span>
                    </div>
                  </li>
                }
              >
                {module.description || 'Unknown'}
              </Tooltip>
            ))}
          </ul>

          {filteredModules.length === 0 && (
            <div className="text-neutral-secondary flex items-center justify-center py-8 text-center text-[11px]">
              {!isValidProjectId(projectId)
                ? 'Please open a valid project'
                : moduleList.length === 0
                  ? 'No modules available'
                  : query
                    ? `No modules found matching "${query}"`
                    : 'No modules match the selected filters'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
