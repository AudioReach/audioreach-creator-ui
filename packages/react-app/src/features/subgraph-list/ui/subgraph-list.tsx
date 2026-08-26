/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type DragEvent, type ReactElement, useEffect, useMemo} from 'react';

import {Check, Cuboid, ListFilter, Search} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Popover} from '@qualcomm-ui/react/popover';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {useSubgraphList} from '~features/graph-designer';
import {useUserPreferences} from '~shared/config/hooks';
import {
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
} from '~shared/config/user-preferences-types';
import {isValidProjectId} from '~shared/config/utils';
import {logger} from '~shared/lib/logger';
import {useProjectStoreShallow} from '~shared/store';
import {useGlobalStore} from '~shared/store/global-store';
import {searchItems} from '~shared/utils/search-utils';

const SUBGRAPH_DRAG_MIME = 'application/x-audioreach-node-type-subgraph';

function handleDragStart(
  subgraph: {subgraphId: string},
  event: DragEvent,
): void {
  const draggedSubgraphInfo = {
    kind: 'subgraph',
    subgraphId: subgraph.subgraphId,
  };

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify(draggedSubgraphInfo),
  );
  event.dataTransfer.setData(SUBGRAPH_DRAG_MIME, '');
  event.dataTransfer.effectAllowed = 'copy';
  logger.info('Subgraph drag started');
}

export function SubgraphList(): ReactElement {
  // Get the active project ID from the global store
  const projectId = useGlobalStore((s) => s.activeProjectId);
  const {preferences} = useUserPreferences();

  const isEditable = useProjectStoreShallow((s) => s.editModeState === 'edit');
  const isSystemWorkflow =
    preferences.usecases.workflowType === WORKFLOW_TYPES.SYSTEM;
  const isSubsystemLevel =
    preferences.usecases.workflowLevel === WORKFLOW_LEVELS.SUBSYSTEM;

  // Get subgraph list state from tab store via hook
  const {
    loadSubgraphList,
    presentSubgraphIds,
    selectedSubgraphTypes,
    setSelectedSubgraphTypes,
    setSubgraphListSearchQuery,
    subgraphList,
    subgraphListSearchQuery,
    subgraphListStatus,
  } = useSubgraphList();

  // Load subgraph list when project changes
  useEffect(() => {
    if (!isValidProjectId(projectId ?? undefined)) {
      logger.info('[SubgraphList] No valid project ID, skipping fetch');
      return;
    }
    if (subgraphListStatus === 'uninitialized') {
      void loadSubgraphList();
    }
    logger.debug(`[SubgraphList] editable state: ${isEditable}`, {
      component: 'SubgraphList',
    });
  }, [projectId, subgraphListStatus, loadSubgraphList, isEditable]);

  const isLoading = subgraphListStatus === 'loading';

  const presentSubgraphIdSet = useMemo(
    () => new Set(presentSubgraphIds),
    [presentSubgraphIds],
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
    if (selectedSubgraphTypes.length === 0) {
      return [];
    }

    let result = subgraphList.filter((subgraph) =>
      selectedSubgraphTypes.includes(subgraph.subgraphType),
    );

    if (subgraphListSearchQuery) {
      result = searchItems(result, subgraphListSearchQuery);
    }

    return result;
  }, [subgraphList, subgraphListSearchQuery, selectedSubgraphTypes]);

  const handleSubgraphTypeToggle = (subgraphType: string, checked: boolean) => {
    if (checked) {
      setSelectedSubgraphTypes([...selectedSubgraphTypes, subgraphType]);
    } else {
      setSelectedSubgraphTypes(
        selectedSubgraphTypes.filter((t) => t !== subgraphType),
      );
    }
  };

  const handleClearFilters = () => {
    setSelectedSubgraphTypes(uniqueSubgraphTypes);
  };

  const handleUnselectAll = () => {
    setSelectedSubgraphTypes([]);
  };

  const showFilterIcon = uniqueSubgraphTypes.length > 1;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TextInput
          aria-label="Search subgraphs"
          onValueChange={setSubgraphListSearchQuery}
          placeholder="Search"
          size="sm"
          startIcon={Search}
          value={subgraphListSearchQuery}
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
              <div className="border-neutral-02 my-0.5 border-t" />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-0.5 px-0.5">
                <Button
                  className="text-[10px] whitespace-nowrap"
                  emphasis="neutral"
                  onClick={handleClearFilters}
                  size="sm"
                  variant="ghost"
                >
                  Clear Filters
                </Button>
                <Button
                  className="text-[10px] whitespace-nowrap"
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
            {filteredSubgraphs.map((subgraph) => {
              const isAlreadyPresent = presentSubgraphIdSet.has(
                subgraph.subgraphId,
              );
              const disabledReason = !isEditable
                ? 'Switch to edit mode to drag subgraphs'
                : isSystemWorkflow
                  ? 'Subgraphs cannot be dragged in system workflow'
                  : isSubsystemLevel
                    ? 'Subgraphs cannot be dragged in subsystem level'
                    : isAlreadyPresent
                      ? 'Already present on the canvas'
                      : null;
              const canDragSubgraph = isEditable && disabledReason === null;

              return (
                <Tooltip
                  key={subgraph.subgraphId}
                  trigger={
                    <li
                      aria-disabled={disabledReason !== null}
                      className={`flex cursor-default items-center gap-3 ${
                        disabledReason ? 'opacity-50' : ''
                      }`}
                      draggable={canDragSubgraph}
                      onDragStart={(event) => {
                        if (!canDragSubgraph) {
                          event.preventDefault();
                          return;
                        }
                        handleDragStart(subgraph, event);
                      }}
                    >
                      <Cuboid className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col gap-0">
                        <span className="text-[11px] font-semibold">
                          {subgraph.subgraphName}
                        </span>
                        <span className="text-neutral-secondary text-[10px]">
                          {subgraph.subgraphType.toUpperCase()}
                        </span>
                      </div>
                    </li>
                  }
                >
                  {disabledReason
                    ? disabledReason
                    : subgraph.description || 'No description available'}
                </Tooltip>
              );
            })}
          </ul>

          {filteredSubgraphs.length === 0 && (
            <div className="text-neutral-secondary flex items-center justify-center py-8 text-center text-[11px]">
              {!isValidProjectId(projectId ?? undefined)
                ? 'Please open a valid project'
                : subgraphList.length === 0
                  ? 'No subgraphs available'
                  : subgraphListSearchQuery
                    ? `No subgraphs found matching "${subgraphListSearchQuery}"`
                    : 'No subgraphs match the selected filters'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
