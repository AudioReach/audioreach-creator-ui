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
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {ConfigSummaryView} from '../../config-summary-view';
import {useSubsystemConfigStore} from '../../model/subsystem-config-store';

import {AVAILABLE_KEYS, SAMPLE_CONFIGURED_KEYS} from './subsystem-config.types';

export interface SubsystemConfigPanelProps {
  isEditable: boolean;
  subsystemId: number;
}

export function SubsystemConfigPanel({
  isEditable,
  subsystemId,
}: SubsystemConfigPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeysList, setShowKeysList] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Get store state
  let availableKeys = useSubsystemConfigStore((state) => state.availableKeys);
  if (!availableKeys) {
    availableKeys = AVAILABLE_KEYS;
  }
  const configuredKeysArray = useSubsystemConfigStore(
    (state) => state.configuredKeys,
  );

  // Get store actions
  const fetchSubsystemConfig = useSubsystemConfigStore(
    (state) => state.fetchSubsystemConfig,
  );
  const updateConfiguredKeys = useSubsystemConfigStore(
    (state) => state.updateConfiguredKeys,
  );
  const addConfiguredKey = useSubsystemConfigStore(
    (state) => state.addConfiguredKey,
  );
  const removeConfiguredKey = useSubsystemConfigStore(
    (state) => state.removeConfiguredKey,
  );

  // Get configured keys for current subsystem
  const configuredKeys = useMemo(() => {
    const subsystem = configuredKeysArray.find(
      (c) => c.subsystemId === subsystemId,
    );
    return subsystem?.keys || [];
  }, [configuredKeysArray, subsystemId]);

  // Fetch data on mount and initialize with sample data if needed
  useEffect(() => {
    fetchSubsystemConfig(subsystemId);

    // TODO: Remove the below code after fecthing the data from the store.
    // If store doesn't have data for this subsystem after fetch attempt, initialize with sample data
    const subsystem = configuredKeysArray.find(
      (c) => c.subsystemId === subsystemId,
    );
    if (!subsystem) {
      // Initialize store with sample data so delete/add operations work
      updateConfiguredKeys(subsystemId, SAMPLE_CONFIGURED_KEYS);
    }
  }, [
    subsystemId,
    fetchSubsystemConfig,
    configuredKeysArray,
    updateConfiguredKeys,
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

  const handleDeleteConfiguredKey = (id: number) => {
    removeConfiguredKey(subsystemId, id);
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

  const handleApply = () => {
    if (!availableKeys) {
      return;
    }

    // Validate and prevent duplicate keys
    const configuredKeyIds = new Set(configuredKeys.map((k) => k.id));
    const keysToAdd = availableKeys.filter(
      (key) => selectedKeys.includes(key.id) && !configuredKeyIds.has(key.id),
    );

    if (keysToAdd.length > 0) {
      // Add each key individually
      keysToAdd.forEach((key) => {
        addConfiguredKey(subsystemId, key);
      });
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
        isEditable={isEditable}
        items={summaryItems}
        onAddClick={handleAddClick}
        onDeleteItem={handleDeleteConfiguredKey}
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
        <div
          className="overflow-hidden rounded-md border shadow-sm"
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            borderColor: 'var(--color-border-neutral-02)',
          }}
        >
          {/* List Header with Sorting */}
          <div
            className="flex items-center gap-3 border-b px-3 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border-neutral-02)',
            }}
          >
            <Checkbox
              aria-label="Select all keys"
              checked={allKeysSelected}
              indeterminate={someKeysSelected}
              onChange={(e) =>
                handleSelectAll((e.target as HTMLInputElement).checked)
              }
              size="sm"
            />
            <button
              className="flex w-32 items-center gap-1 transition-colors"
              onClick={() => handleSort('id')}
              style={{color: 'var(--color-text-neutral-primary)'}}
            >
              <span>Key ID</span>
              {getSortIcon('id')}
            </button>
            <button
              className="flex flex-1 items-center gap-1 text-left transition-colors"
              onClick={() => handleSort('name')}
              style={{color: 'var(--color-text-neutral-primary)'}}
            >
              <span>Key Name</span>
              {getSortIcon('name')}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-auto">
            {displayKeys.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                style={{color: 'var(--color-text-neutral-tertiary)'}}
              >
                <div className="mb-2 text-2xl">🔍</div>
                <p>No keys match your search</p>
              </div>
            ) : (
              displayKeys.map((key) => {
                const isSelected = selectedKeys.includes(key.id);
                return (
                  <div
                    key={key.id}
                    className="flex items-center gap-3 border-b px-3 py-2.5 transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-surface-secondary)'
                        : 'transparent',
                      borderColor: 'var(--color-border-neutral-01)',
                    }}
                  >
                    <Checkbox
                      aria-label={`Select ${key.name}`}
                      checked={isSelected}
                      onChange={(e) =>
                        handleKeySelection(
                          key.id,
                          (e.target as HTMLInputElement).checked,
                        )
                      }
                      size="sm"
                    />
                    <div
                      className="w-32 font-mono text-sm"
                      style={{color: 'var(--color-text-neutral-secondary)'}}
                    >
                      {ConvertNumberToHexString(key.id)}
                    </div>
                    <div
                      className="flex flex-1 items-center gap-2 text-sm font-medium"
                      style={{color: 'var(--color-text-neutral-primary)'}}
                    >
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
            disabled={selectedKeys.length === 0}
            emphasis="primary"
            onClick={handleApply}
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
