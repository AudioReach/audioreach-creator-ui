/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo, useState} from 'react';

import {ArrowDown, ArrowUp, ArrowUpDown} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';

import ArcSearchBar from '~shared/controls/arc-search-bar';
import type {
  Key,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {ConfigSummaryView} from '../../config-summary-view';
import {useSubsystemConfigStore} from '../../model/subsystem-config-store';

export interface SubsystemConfigPanelProps {
  /** Filtered keys the backend currently holds for this subsystem. */
  backendKeys: Key[];
  isEditable: boolean;
  isMutating: boolean;
  projectId: string;
  runExclusive: <T>(action: () => Promise<T>) => Promise<T>;
  subsystemId: number;
  subsystemSystemId: string;
}

export function SubsystemConfigPanel({
  backendKeys,
  isEditable,
  isMutating,
  projectId,
  runExclusive,
  subsystemId,
  subsystemSystemId,
}: SubsystemConfigPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeysList, setShowKeysList] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Get store state
  const availableKeys = useSubsystemConfigStore((state) => state.availableKeys);
  const configuredKeysArray = useSubsystemConfigStore(
    (state) => state.configuredKeys,
  );

  // Get store actions
  const fetchSubsystemConfig = useSubsystemConfigStore(
    (state) => state.fetchSubsystemConfig,
  );
  const initializeSubsystemConfig = useSubsystemConfigStore(
    (state) => state.initialize,
  );
  const saveFilteredKeys = useSubsystemConfigStore(
    (state) => state.saveFilteredKeys,
  );

  // Get configured keys for current subsystem
  const configuredKeys = useMemo(() => {
    const subsystem = configuredKeysArray.find(
      (c) => c.subsystemId === subsystemId,
    );
    return subsystem?.keys || [];
  }, [configuredKeysArray, subsystemId]);

  // Seed backend keys and load available keys on mount
  useEffect(() => {
    if (!projectId) {
      return;
    }

    initializeSubsystemConfig(projectId);
    void fetchSubsystemConfig(subsystemId, backendKeys);
  }, [
    projectId,
    subsystemId,
    backendKeys,
    initializeSubsystemConfig,
    fetchSubsystemConfig,
  ]);

  // Filter available keys based on search term
  const filteredKeys = useMemo(() => {
    if (!availableKeys) {
      return [];
    }
    if (!searchTerm) {
      return availableKeys;
    }

    const searchLower = searchTerm.toLowerCase();
    const searchNumber = ConvertStringToNumber(searchTerm);

    return availableKeys.filter(
      (key) =>
        key.name.toLowerCase().includes(searchLower) ||
        (searchNumber !== null && key.id === searchNumber),
    );
  }, [availableKeys, searchTerm]);

  // Sort and display all filtered keys
  const displayKeys = useMemo(() => {
    const sorted = [...filteredKeys].sort((a, b) => {
      if (sortColumn === 'id') {
        return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
      } else {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
    return sorted;
  }, [filteredKeys, sortColumn, sortOrder]);

  const handleAddClick = () => {
    setShowKeysList(true);
    setSearchTerm('');
    setSelectedKeys([]);
  };

  const handleDeleteConfiguredKey = async (id: number) => {
    const newKeys = configuredKeys.filter((key) => key.id !== id);
    try {
      return await runExclusive(() =>
        saveFilteredKeys(subsystemId, subsystemSystemId, newKeys),
      );
    } catch {
      return false;
    }
  };

  const handleKeySelection = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedKeys((prev) => [...prev, id]);
    } else {
      setSelectedKeys((prev) => prev.filter((keyId) => keyId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(displayKeys.map((key) => key.id));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const handleApply = async () => {
    if (!availableKeys) {
      return;
    }

    // Validate and prevent duplicate keys
    const configuredKeyIds = new Set(configuredKeys.map((k) => k.id));
    const keysToAdd = availableKeys.filter(
      (key) => selectedKeys.includes(key.id) && !configuredKeyIds.has(key.id),
    );

    if (keysToAdd.length > 0) {
      let saved = false;
      try {
        saved = await runExclusive(() =>
          saveFilteredKeys(subsystemId, subsystemSystemId, [
            ...configuredKeys,
            ...keysToAdd,
          ]),
        );
      } catch {
        saved = false;
      }
      if (!saved) {
        return;
      }
    }

    setSelectedKeys([]);
    setShowKeysList(false);
    setSearchTerm('');
  };

  const handleCancel = () => {
    if (selectedKeys.length > 0) {
      // if (
      //   window.confirm(
      //     "Are you sure you want to cancel? All key selections will be lost.",
      //   )
      // )
      {
        setSelectedKeys([]);
        setShowKeysList(false);
        setSearchTerm('');
      }
    } else {
      setShowKeysList(false);
      setSearchTerm('');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const summaryItems = configuredKeys.map((key) => ({
    id: key.id,
    label: `[${key.name}]`,
  }));

  // Calculate checkbox states for select all
  const allKeysSelected =
    displayKeys.length > 0 && selectedKeys.length === displayKeys.length;
  const someKeysSelected =
    selectedKeys.length > 0 && selectedKeys.length < displayKeys.length;

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* Configured Keys Summary */}
      <ConfigSummaryView
        isEditable={isEditable && !isMutating}
        items={summaryItems}
        onAddClick={handleAddClick}
        onDeleteItem={(id) => void handleDeleteConfiguredKey(id)}
        title="Configured Keys"
      />

      {/* Search Container - shown when Add is clicked */}
      {showKeysList && (
        <ArcSearchBar
          onSearchChange={setSearchTerm}
          placeholder="Search by ID or Name"
          searchTerm={searchTerm}
        />
      )}

      {/* Keys List - shown when Add is clicked */}
      {showKeysList && (
        <div className="bg-primary border-neutral-02 overflow-hidden rounded-md border shadow-sm">
          {/* List Header with Sorting */}
          <div className="bg-secondary border-neutral-02 flex items-center gap-3 border-b px-3 py-2 text-sm font-semibold">
            <Checkbox
              aria-label="Select all keys"
              checked={allKeysSelected}
              indeterminate={someKeysSelected}
              onCheckedChange={(checked) => handleSelectAll(checked)}
              size="sm"
            />
            <button
              className="text-neutral-primary flex w-32 items-center gap-1 transition-colors"
              onClick={() => handleSort('id')}
            >
              <span>Key ID</span>
              {getSortIcon('id')}
            </button>
            <button
              className="text-neutral-primary flex flex-1 items-center gap-1 text-left transition-colors"
              onClick={() => handleSort('name')}
            >
              <span>Key Name</span>
              {getSortIcon('name')}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-auto">
            {displayKeys.length === 0 ? (
              <div className="text-neutral-secondary flex flex-col items-center justify-center py-12">
                <div className="mb-2 text-2xl">🔍</div>
                <p>No keys match your search</p>
              </div>
            ) : (
              displayKeys.map((key) => {
                const isSelected = selectedKeys.includes(key.id);
                return (
                  <div
                    key={key.id}
                    className={`border-neutral-01 flex items-center gap-3 border-b px-3 py-2.5 transition-colors ${
                      isSelected ? 'bg-secondary' : 'bg-transparent'
                    }`}
                  >
                    <Checkbox
                      aria-label={`Select ${key.name}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleKeySelection(key.id, checked)
                      }
                      size="sm"
                    />
                    <div className="text-neutral-secondary w-32 font-mono text-sm">
                      {ConvertNumberToHexString(key.id)}
                    </div>
                    <div className="text-neutral-primary flex flex-1 items-center gap-2 text-sm font-medium">
                      {key.name}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showKeysList && (
        <div className="flex justify-end gap-2">
          <Button
            emphasis="primary"
            onClick={handleCancel}
            size="sm"
            variant="fill"
          >
            Cancel
          </Button>
          <Button
            disabled={selectedKeys.length === 0 || isMutating}
            emphasis="primary"
            onClick={() => void handleApply()}
            size="sm"
            variant="fill"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
