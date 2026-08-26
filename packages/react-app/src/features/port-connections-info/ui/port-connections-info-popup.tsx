/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {TextInput} from '@qualcomm-ui/react/text-input';

import type {UsecaseDto} from '~entities/usecases';
import {showToast} from '~shared/controls/global-toaster';

import {filterConnectionRows} from '../lib/filter-connection-rows';
import {matchesSearch} from '../lib/matches-search';
import type {
  ConnectionFilter,
  ConnectionRow,
  PortConnectionsInfoState,
} from '../model/port-connections-info.types';

import {AdvancedDetailsToggle} from './advanced-details-toggle';
import {ConnectionsFilter} from './connections-filter';
import {ConnectionsTable} from './connections-table';
import {UsecaseChecklist} from './usecase-checklist';

export interface PortConnectionsInfoPopupProps {
  isReadonly: boolean;
  onAdd: (usecases: UsecaseDto[]) => void;
  onClose: () => void;
  onNavigate: (usecases: UsecaseDto[]) => void;
  open: boolean;
  resolveSubgraphDisplay: (subgraphSystemId: string) => string;
  state: PortConnectionsInfoState;
}

function dedupeCheckedUsecases(
  checkedUsecasesByRow: Map<string, UsecaseDto[]>,
): UsecaseDto[] {
  const bySystemId = new Map<string, UsecaseDto>();
  for (const usecases of checkedUsecasesByRow.values()) {
    for (const usecase of usecases) {
      bySystemId.set(usecase.systemId, usecase);
    }
  }
  return [...bySystemId.values()];
}

export function PortConnectionsInfoPopup({
  isReadonly,
  onAdd,
  onClose,
  onNavigate,
  open,
  resolveSubgraphDisplay,
  state,
}: PortConnectionsInfoPopupProps) {
  const [filter, setFilter] = useState<ConnectionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowSystemId, setSelectedRowSystemId] = useState<
    string | undefined
  >(undefined);
  const [checkedUsecasesByRow, setCheckedUsecasesByRow] = useState<
    Map<string, UsecaseDto[]>
  >(new Map());
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Reset all local session state on every fresh open
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setFilter('all');
    setSearchQuery('');
    setSelectedRowSystemId(undefined);
    setCheckedUsecasesByRow(new Map());
    setShowAdvancedDetails(false);
  }
  if (open !== wasOpen) {
    setWasOpen(open);
  }

  const rows = useMemo<ConnectionRow[]>(
    () => (state.status === 'ready' ? state.rows : []),
    [state],
  );
  const visibleRows = useMemo(
    () =>
      filterConnectionRows(rows, filter).filter((row) =>
        matchesSearch(row, searchQuery, resolveSubgraphDisplay),
      ),
    [rows, filter, searchQuery, resolveSubgraphDisplay],
  );

  const selectedRow = rows.find((row) => row.systemId === selectedRowSystemId);
  const usecasesForSelectedRow = selectedRow?.usecases ?? [];
  const checkedUsecasesForSelectedRow =
    selectedRowSystemId === undefined
      ? []
      : (checkedUsecasesByRow.get(selectedRowSystemId) ?? []);

  const handleChecklistChange = (checked: UsecaseDto[]): void => {
    if (selectedRowSystemId === undefined) {
      return;
    }
    setCheckedUsecasesByRow((prev) => {
      const next = new Map(prev);
      next.set(selectedRowSystemId, checked);
      return next;
    });
  };

  const isReady = state.status === 'ready';
  const canMutateSelection = isReadonly && isReady;

  const handleAdd = (): void => {
    const usecases = dedupeCheckedUsecases(checkedUsecasesByRow);
    if (usecases.length === 0) {
      showToast('Select at least one usecase.', 'warning');
      return;
    }
    onAdd(usecases);
    onClose();
  };
  const handleNavigate = (): void => {
    const usecases = dedupeCheckedUsecases(checkedUsecasesByRow);
    if (usecases.length === 0) {
      showToast('Select at least one usecase.', 'warning');
      return;
    }
    onNavigate(usecases);
    onClose();
  };
  const handleCancel = (): void => {
    onClose();
  };

  function renderBody() {
    if (state.status === 'loading-modules') {
      return (
        <div className="flex flex-col items-center gap-2 py-8">
          <ProgressRing />
          <span>Loading module details…</span>
        </div>
      );
    }
    if (state.status === 'error') {
      return (
        <div className="text-support-danger py-8 text-center">
          {state.message}
        </div>
      );
    }
    if (state.status === 'ready') {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TextInput
              aria-label="Search connections"
              className="min-w-0 flex-1"
              data-testid="connections-search"
              onValueChange={setSearchQuery}
              placeholder="sg: / iid: / mod: / text"
              size="sm"
              value={searchQuery}
            />
            <ConnectionsFilter onChange={setFilter} value={filter} />
            <div className="shrink-0">
              <AdvancedDetailsToggle
                checked={showAdvancedDetails}
                onChange={setShowAdvancedDetails}
              />
            </div>
          </div>
          <ConnectionsTable
            onSelectRow={setSelectedRowSystemId}
            resolveSubgraphDisplay={resolveSubgraphDisplay}
            rows={visibleRows}
            selectedRowSystemId={selectedRowSystemId}
            showAdvancedDetails={showAdvancedDetails}
          />
          <UsecaseChecklist
            checkedUsecases={checkedUsecasesForSelectedRow}
            onChange={handleChecklistChange}
            usecases={usecasesForSelectedRow}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      placement="center"
      scrollBehavior="inside"
      size="md"
    >
      <Dialog.FloatingPortal
        contentProps={{className: '!max-h-[85vh] !w-[min(950px,95vw)]'}}
      >
        <Dialog.Body className="!max-h-[calc(85vh-8rem)] overflow-y-auto">
          <Dialog.Heading>Port Connections Information</Dialog.Heading>
          {renderBody()}
        </Dialog.Body>
        <Dialog.Footer>
          {isReady && (
            <Button onClick={handleAdd} size="sm">
              Add to selected usecases
            </Button>
          )}
          {canMutateSelection && (
            <Button onClick={handleNavigate} size="sm">
              Navigate to selected usecases
            </Button>
          )}
          <Button onClick={handleCancel} size="sm" variant="outline">
            Cancel
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
