/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ReactElement, useEffect, useMemo, useState} from 'react';

import {Check, Cuboid, ListFilter, Search} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Popover} from '@qualcomm-ui/react/popover';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {getAllSubgraphs} from '~entities/subgraph-definitions/api/subgraph-definition-api';
import type {SubgraphDto} from '~entities/subgraph-definitions/model/subgraph-definition.dto';
import {isValidProjectId} from '~shared/config/utils';
import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';
import {searchItems} from '~shared/utils/search-utils';

import {useSubgraphListStore} from '../model/subgraph-list-store';
import type {DraggedSubgraphInfo} from '../model/subgraph-list-types';

/**
 * Handle drag start event for subgraphs
 */
function handleDragStart(subgraph: SubgraphDto, event: React.DragEvent): void {
  const draggedSubgraphInfo: DraggedSubgraphInfo = {
    subgraphId: subgraph.subgraphId,
    subgraphType: subgraph.subgraphType,
  };

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify(draggedSubgraphInfo),
  );
  event.dataTransfer.effectAllowed = 'copy';
  logger.info('Subgraph drag started');
}

export function SubgraphList(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  // Get the active project ID from the project layout store
  const activeProjectGroup = useProjectLayoutStore((state) =>
    state.getActiveProjectGroup(),
  );

  // Use projectKey as the project ID (this is the unique identifier for the project)
  const projectId = activeProjectGroup?.projectKey;

  // Load subgraph list data from API
  useEffect(() => {
    // Only fetch if we have a valid project ID
    if (!isValidProjectId(projectId)) {
      logger.info('[SubgraphList] No valid project ID, skipping fetch');
      setIsLoading(false);
      return;
    }

    const loadSubgraphList = async () => {
      setIsLoading(true);
      logger.info(
        `[SubgraphList] Fetching subgraph list for project: ${projectId}`,
      );
      const result = await getAllSubgraphs(projectId);

      if (result.success && result.data) {
        logger.info(
          `[SubgraphList] Successfully fetched ${result.data.length} subgraphs`,
        );

        // Get store action
        const {setSubgraphList} = useSubgraphListStore.getState();

        // Set all subgraphs at once
        setSubgraphList(result.data);

        logger.info('[SubgraphList] Subgraph list loaded successfully');
      } else {
        logger.error(
          `[SubgraphList] ${result.message || 'Failed to load subgraph list'}`,
        );
      }

      setIsLoading(false);
    };

    void loadSubgraphList();
  }, [projectId]);

  const subgraphList = useSubgraphListStore((state) => state.subgraphList);
  const query = useSubgraphListStore((state) => state.query);
  const setSearchString = useSubgraphListStore(
    (state) => state.setSearchString,
  );
  const isDragEnabled = useSubgraphListStore((state) => state.isDragEnabled);
  const selectedSubgraphTypes = useSubgraphListStore(
    (state) => state.selectedSubgraphTypes,
  );
  const setSelectedSubgraphTypes = useSubgraphListStore(
    (state) => state.setSelectedSubgraphTypes,
  );

  // Extract unique subgraph types from data
  const uniqueSubgraphTypes = useMemo(() => {
    const types = new Set<string>();
    subgraphList.forEach((subgraph) => {
      types.add(subgraph.subgraphType);
    });
    return Array.from(types).sort();
  }, [subgraphList]);

  // Filter subgraphs based on selected types and search query
  const filteredSubgraphs = useMemo(() => {
    let result = subgraphList;

    // If nothing is selected in subgraph types, show nothing
    if (selectedSubgraphTypes.length === 0) {
      return [];
    }

    // Apply subgraph type filter
    result = result.filter((subgraph) =>
      selectedSubgraphTypes.includes(subgraph.subgraphType),
    );

    // Apply search filter
    if (query) {
      result = searchItems(result, query);
    }

    return result;
  }, [subgraphList, query, selectedSubgraphTypes]);

  // Handle subgraph type checkbox toggle
  const handleSubgraphTypeToggle = (subgraphType: string, checked: boolean) => {
    if (checked) {
      setSelectedSubgraphTypes([...selectedSubgraphTypes, subgraphType]);
    } else {
      setSelectedSubgraphTypes(
        selectedSubgraphTypes.filter((t) => t !== subgraphType),
      );
    }
  };

  // Clear Filters - Select all checkboxes (clears filters, shows all)
  const handleClearFilters = () => {
    setSelectedSubgraphTypes(uniqueSubgraphTypes);
  };

  // Unselect All - Uncheck all checkboxes (hides all)
  const handleUnselectAll = () => {
    setSelectedSubgraphTypes([]);
  };

  // Restore or initialize filters when project/data changes
  useEffect(() => {
    if (!projectId || subgraphList.length === 0) {
      return;
    }

    const store = useSubgraphListStore.getState();
    const savedProjectFilters = store.projectFilters[projectId];

    if (savedProjectFilters) {
      setSelectedSubgraphTypes(savedProjectFilters.subgraphTypeFilter);
    } else {
      // No saved filters - select all
      setSelectedSubgraphTypes(uniqueSubgraphTypes);
    }
  }, [
    projectId,
    subgraphList.length,
    uniqueSubgraphTypes,
    setSelectedSubgraphTypes,
  ]);

  // Auto-save filters when they change
  useEffect(() => {
    if (!projectId || subgraphList.length === 0) {
      return;
    }

    const store = useSubgraphListStore.getState();
    store.projectFilters[projectId] = {
      subgraphTypeFilter: selectedSubgraphTypes,
    };
  }, [projectId, selectedSubgraphTypes, subgraphList.length]);

  // Show filter only if there are meaningful choices to make
  const showFilterIcon = uniqueSubgraphTypes.length > 1;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TextInput
          aria-label="Search subgraphs"
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
              {/* Subgraph Type Section */}
              <div className="px-1.5 pb-1">
                <h3 className="text-[11px] font-semibold">Subgraph Type</h3>
                <div className="flex flex-col">
                  {uniqueSubgraphTypes.map((subgraphType) => (
                    <div
                      key={subgraphType}
                      aria-checked={selectedSubgraphTypes.includes(
                        subgraphType,
                      )}
                      className="flex w-full items-center gap-1 px-1 py-0.5"
                      onClick={() =>
                        handleSubgraphTypeToggle(
                          subgraphType,
                          !selectedSubgraphTypes.includes(subgraphType),
                        )
                      }
                      role="checkbox"
                    >
                      <InlineIconButton
                        aria-label={`Toggle ${subgraphType}`}
                        className={
                          selectedSubgraphTypes.includes(subgraphType)
                            ? 'opacity-100'
                            : 'opacity-0'
                        }
                        icon={Check}
                        size="sm"
                      />
                      <span className="text-[10px]">
                        {subgraphType.toUpperCase()}
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
          Loading subgraphs...
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {filteredSubgraphs.map((subgraph) => (
              <Tooltip
                key={subgraph.subgraphId}
                trigger={
                  <li
                    className={`flex items-center gap-3 ${isDragEnabled ? 'cursor-grab' : 'cursor-default'}`}
                    draggable={isDragEnabled}
                    onDragStart={(e) => handleDragStart(subgraph, e)}
                  >
                    <Cuboid className="h-4 w-4 shrink-0" />
                    <div className="flex flex-col gap-0">
                      <span className="text-[11px] font-semibold">
                        {subgraph.name}
                      </span>
                      <span className="text-neutral-secondary text-[10px]">
                        {subgraph.subgraphType.toUpperCase()}
                      </span>
                    </div>
                  </li>
                }
              >
                {subgraph.description || 'No description available'}
              </Tooltip>
            ))}
          </ul>

          {filteredSubgraphs.length === 0 && (
            <div className="text-neutral-secondary flex items-center justify-center py-8 text-center text-[11px]">
              {!isValidProjectId(projectId)
                ? 'Please open a valid project'
                : subgraphList.length === 0
                  ? 'No subgraphs available'
                  : query
                    ? `No subgraphs found matching "${query}"`
                    : 'No subgraphs match the selected filters'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
