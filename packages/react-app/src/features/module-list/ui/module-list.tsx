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

import {useModuleList} from '~features/graph-designer';
import {isValidProjectId} from '~shared/config/utils';
import {logger} from '~shared/lib/logger';
import {useProjectStoreShallow} from '~shared/store';
import {useGlobalStore} from '~shared/store/global-store';
import {searchItems} from '~shared/utils/search-utils';

export function ModuleList(): ReactElement {
  // Get the active project ID from the global store
  const projectId = useGlobalStore((s) => s.activeProjectId);

  // No editable actions exist in this palette yet (browse/filter only) — read
  // for when drag-to-canvas placement lands, so this stays wired to the same
  // source every other panel already reads.
  const isEditable = useProjectStoreShallow((s) => s.editModeState === 'edit');

  // Get module list state from tab store via hook
  const {
    loadModuleList,
    moduleList,
    moduleListSearchQuery,
    moduleListStatus,
    selectedDspTypes,
    selectedModuleTypes,
    setModuleListSearchQuery,
    setSelectedDspTypes,
    setSelectedModuleTypes,
  } = useModuleList();

  // Load module list when project changes
  useEffect(() => {
    if (!isValidProjectId(projectId ?? undefined)) {
      logger.info('[ModuleList] No valid project ID, skipping fetch');
      return;
    }
    if (moduleListStatus === 'uninitialized') {
      void loadModuleList();
    }
    logger.debug(`[ModuleList] editable state: ${isEditable}`, {
      component: 'ModuleList',
    });
  }, [projectId, moduleListStatus, loadModuleList, isEditable]);

  const isLoading = moduleListStatus === 'loading';

  // Extract unique DSP types from data
  const uniqueDspTypes = useMemo(() => {
    const types = new Set<string>();
    moduleList.forEach((module) => {
      if (module.dspType) {
        types.add(module.dspType);
      }
    });
    return Array.from(types).sort();
  }, [moduleList]);

  // Extract unique Module types from data
  const uniqueModuleTypes = useMemo(() => {
    const types = new Set<string>();
    moduleList.forEach((module) => {
      if (module.category) {
        types.add(module.category);
      }
    });
    return Array.from(types).sort();
  }, [moduleList]);

  // Filter modules based on selected types and search query
  const filteredModules = useMemo(() => {
    if (selectedDspTypes.length === 0 || selectedModuleTypes.length === 0) {
      return [];
    }

    let result = moduleList.filter(
      (module) =>
        selectedDspTypes.includes(module.dspType) &&
        selectedModuleTypes.includes(module.category),
    );

    if (moduleListSearchQuery) {
      result = searchItems(result, moduleListSearchQuery);
    }

    return result;
  }, [
    moduleList,
    moduleListSearchQuery,
    selectedDspTypes,
    selectedModuleTypes,
  ]);

  const handleDspTypeToggle = (dspType: string, checked: boolean) => {
    if (checked) {
      setSelectedDspTypes([...selectedDspTypes, dspType]);
    } else {
      setSelectedDspTypes(selectedDspTypes.filter((t) => t !== dspType));
    }
  };

  const handleModuleTypeToggle = (moduleType: string, checked: boolean) => {
    if (checked) {
      setSelectedModuleTypes([...selectedModuleTypes, moduleType]);
    } else {
      setSelectedModuleTypes(
        selectedModuleTypes.filter((t) => t !== moduleType),
      );
    }
  };

  const handleClearFilters = () => {
    setSelectedDspTypes(uniqueDspTypes);
    setSelectedModuleTypes(uniqueModuleTypes);
  };

  const handleUnselectAll = () => {
    setSelectedDspTypes([]);
    setSelectedModuleTypes([]);
  };

  const showFilterIcon =
    uniqueDspTypes.length > 1 || uniqueModuleTypes.length > 1;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TextInput
          aria-label="Search modules"
          onValueChange={setModuleListSearchQuery}
          placeholder="Search"
          size="sm"
          startIcon={Search}
          value={moduleListSearchQuery}
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
                      <span className="text-[10px]">{dspType}</span>
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
                      <span className="text-[10px]">{moduleType}</span>
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
                key={module.moduleId}
                trigger={
                  <li className="flex cursor-default items-center gap-3">
                    {module.builtIn ? (
                      <Box className="h-4 w-4 shrink-0" />
                    ) : (
                      <Boxes className="h-4 w-4 shrink-0" />
                    )}
                    <div className="flex flex-col gap-0">
                      <span className="text-[11px] font-semibold">
                        {module.moduleName}
                      </span>
                      <span className="text-neutral-secondary text-[10px]">
                        {module.dspType} • {module.category}
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
              {!isValidProjectId(projectId ?? undefined)
                ? 'Please open a valid project'
                : moduleList.length === 0
                  ? 'No modules available'
                  : moduleListSearchQuery
                    ? `No modules found matching "${moduleListSearchQuery}"`
                    : 'No modules match the selected filters'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
