/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
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

import {ConfigSummaryView} from '../../../config-summary-view';
import {useCalibrationKeysStore} from '../../../model/calibration-keys-store';

import type {
  CalibrationKey,
  CkvParameter,
  ConfiguredCkv,
} from './calibration-keys-config.types';
import {CkvParametersSection} from './ckv-parameters-section';

interface CalibrationKeysConfigPanelProps {
  instanceId: number;
  isEditable: boolean;
  moduleId: number;
}

// Helper functions

/**
 * Determines whether a calibration key or any of its values match the given search term.
 *
 * A match occurs when the key name or key ID matches the search term, or when any of the
 * key's values match by name or ID. Numeric search terms are compared against IDs directly.
 *
 * @param keyName - The display name of the calibration key.
 * @param key - The calibration key object containing its ID and associated values.
 * @param searchTerm - The raw string entered by the user in the search bar.
 * @param searchNumber - The numeric representation of `searchTerm`, or `null` if it is not a valid number.
 * @returns `true` if the key or any of its values match the search term; otherwise `false`.
 */
const matchesSearchTerm = (
  keyName: string,
  key: CalibrationKey,
  searchTerm: string,
  searchNumber: number | null,
): boolean => {
  const keyMatches =
    keyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (searchNumber !== null && key.id === searchNumber);
  const valueMatches = key.values.some(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (searchNumber !== null && v.id === searchNumber),
  );
  return keyMatches || valueMatches;
};

/**
 * Returns a sorted copy of the provided key-name array based on the active sort column and order.
 *
 * When `sortColumn` is `null` the original order is preserved. Sorting by `'id'` compares
 * numeric key IDs, while sorting by `'name'` performs a locale-aware, case-insensitive
 * string comparison.
 *
 * @param keys - Array of calibration key names to sort.
 * @param calibrationKeyData - Map from key name to its {@link CalibrationKey} data.
 * @param sortColumn - The column to sort by (`'id'`, `'name'`, or `null` for no sort).
 * @param sortOrder - The direction of the sort: `'asc'` for ascending or `'desc'` for descending.
 * @returns A new sorted array of key names; the original array is not mutated.
 */
const sortKeys = (
  keys: string[],
  calibrationKeyData: Record<string, CalibrationKey>,
  sortColumn: SortColumn,
  sortOrder: SortOrder,
): string[] => {
  if (!sortColumn) {
    return keys;
  }

  return [...keys].sort((a, b) => {
    let comparison: number;
    if (sortColumn === 'id') {
      comparison = calibrationKeyData[a].id - calibrationKeyData[b].id;
    } else {
      comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

/**
 * Reorders the key-name array so that keys with at least one selected value appear first.
 *
 * Keys that have one or more values currently selected are moved to the front of the list,
 * while keys with no selected values follow. The relative order within each group is
 * preserved. This is used when entering edit mode to surface the relevant keys immediately.
 *
 * @param keys - Array of calibration key names to partition.
 * @param calibrationKeyData - Map from key name to its {@link CalibrationKey} data.
 * @param selectedKeyValues - Nested map of `keyId → valueId → isSelected` representing the current selection state.
 * @returns A new array with keys that have selected values placed before those that do not.
 */
const partitionKeysBySelection = (
  keys: string[],
  calibrationKeyData: Record<string, CalibrationKey>,
  selectedKeyValues: Record<number, Record<number, boolean>>,
): string[] => {
  const keysWithSelectedValues = keys.filter((keyName) => {
    const key = calibrationKeyData[keyName];
    const keySelections = selectedKeyValues[key.id];
    return keySelections && key.values.some((v) => keySelections[v.id]);
  });
  const keysWithoutSelectedValues = keys.filter((keyName) => {
    const key = calibrationKeyData[keyName];
    const keySelections = selectedKeyValues[key.id];
    return !keySelections || !key.values.some((v) => keySelections[v.id]);
  });
  return [...keysWithSelectedValues, ...keysWithoutSelectedValues];
};

/**
 * Computes the Cartesian product of the selected values across all calibration keys.
 *
 * Each element of the returned array is one unique combination of key-value pairs — one
 * pair per calibration key — covering every possible permutation of the selected values.
 * For example, given Key A with values [A1, A2] and Key B with values [B1], the result
 * will be [[{A, A1}, {B, B1}], [{A, A2}, {B, B1}]].
 *
 * @param selectedPerKey - Array where each entry contains a calibration key and the list
 *   of values selected for that key.
 * @returns A two-dimensional array of key-value pair combinations representing the full
 *   Cartesian product of the selections.
 */
const generateCartesianProduct = (
  selectedPerKey: Array<{
    key: {id: number; name: string};
    values: Array<{id: number; name: string}>;
  }>,
): Array<
  Array<{
    key: {id: number; name: string};
    value: {id: number; name: string};
  }>
> => {
  const combinations: Array<
    Array<{
      key: {id: number; name: string};
      value: {id: number; name: string};
    }>
  > = [];

  const generate = (
    index: number,
    currentCombo: Array<{
      key: {id: number; name: string};
      value: {id: number; name: string};
    }>,
  ) => {
    if (index === selectedPerKey.length) {
      combinations.push([...currentCombo]);
      return;
    }

    const {key, values} = selectedPerKey[index];
    values.forEach((value) => {
      currentCombo.push({key, value});
      generate(index + 1, currentCombo);
      currentCombo.pop();
    });
  };

  generate(0, []);
  return combinations;
};

/**
 * Transforms the flat selection state map into a structured list grouped by calibration key.
 *
 * Iterates over every key ID present in `selectedKeyValues`, resolves the corresponding
 * key name from `calibrationKeyData`, and collects only the values whose selection flag is
 * `true`. Keys that cannot be resolved or that have no selected values are omitted from the
 * result. The output is consumed by {@link generateCartesianProduct} to produce the final
 * set of CKV combinations.
 *
 * @param selectedKeyValues - Nested map of `keyId → valueId → isSelected` representing the current selection state.
 * @param calibrationKeyData - Map from key name to its {@link CalibrationKey} data, used to resolve key and value metadata.
 * @returns An array of objects, each containing a calibration key descriptor and the list
 *   of selected value descriptors for that key.
 */
const groupSelectedValuesByKey = (
  selectedKeyValues: Record<number, Record<number, boolean>>,
  calibrationKeyData: Record<string, CalibrationKey>,
): Array<{
  key: {id: number; name: string};
  values: Array<{id: number; name: string}>;
}> => {
  const selectedPerKey: Array<{
    key: {id: number; name: string};
    values: Array<{id: number; name: string}>;
  }> = [];

  Object.entries(selectedKeyValues).forEach(([keyIdStr, valueSelections]) => {
    const keyId = parseInt(keyIdStr, 10);

    // Find the key name from the key ID
    const keyName = Object.keys(calibrationKeyData).find(
      (name) => calibrationKeyData[name].id === keyId,
    );
    if (!keyName) {
      return;
    }

    const key = calibrationKeyData[keyName];
    const selectedValues: Array<{id: number; name: string}> = [];

    Object.entries(valueSelections).forEach(([valueIdStr, isSelected]) => {
      if (!isSelected) {
        return;
      }

      const valueId = parseInt(valueIdStr, 10);
      const value = key.values.find((v) => v.id === valueId);
      if (value) {
        selectedValues.push({id: value.id, name: value.name});
      }
    });

    if (selectedValues.length > 0) {
      selectedPerKey.push({
        key: {id: key.id, name: key.name},
        values: selectedValues,
      });
    }
  });

  return selectedPerKey;
};

export function CalibrationKeysConfigPanel({
  instanceId,
  isEditable,
  moduleId,
}: CalibrationKeysConfigPanelProps) {
  // Store state
  const availableKeys = useCalibrationKeysStore((state) => state.availableKeys);
  if (!availableKeys) {
    // TODO: Required to show popup??
  }

  const storeParameters = useCalibrationKeysStore(
    (state) => state.moduleParameters[moduleId],
  );
  const configuredKeyValuesMap = useCalibrationKeysStore(
    (state) => state.configuredKeyValuesMap,
  );

  // Store actions
  const updateConfiguredKeyValues = useCalibrationKeysStore(
    (state) => state.updateConfiguredKeyValues,
  );
  const addConfiguredKey = useCalibrationKeysStore(
    (state) => state.addConfiguredKey,
  );
  const removeConfiguredKey = useCalibrationKeysStore(
    (state) => state.removeConfiguredKey,
  );
  const updateModuleParameters = useCalibrationKeysStore(
    (state) => state.updateModuleParameters,
  );

  // Local state for parameters
  const [parameters, setParameters] = useState<CkvParameter[]>([]);

  const [initialPidConfig, setInitialPidConfig] = useState<number[]>([]);

  // Sync parameters with store when store updates
  useEffect(() => {
    if (storeParameters && storeParameters.length > 0) {
      setParameters(storeParameters);

      // Capture initial checked PIDs
      const checkedPids = storeParameters
        .filter((p) => p.checked)
        .map((p) => p.pid);
      setInitialPidConfig(checkedPids);
    }
  }, [storeParameters]);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeyValues, setSelectedKeyValues] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSearchAndList, setShowSearchAndList] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialEditSelections, setInitialEditSelections] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const configSectionRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Get configured keys for this module instance from store
  const configuredCKVs = useMemo(() => {
    const moduleInstances = configuredKeyValuesMap[moduleId] || [];
    const instance = moduleInstances.find(
      (inst) => inst.instanceId === instanceId,
    );
    return instance?.keyValueList || [];
  }, [configuredKeyValuesMap, moduleId, instanceId]);

  // Filter and sort keys
  const filteredAndSortedKeys = useMemo(() => {
    if (!availableKeys) {
      return [];
    }

    let keys = Object.keys(availableKeys);

    // Filter by search term
    if (searchTerm) {
      const searchNumber = ConvertStringToNumber(searchTerm);
      keys = keys.filter((keyName) =>
        matchesSearchTerm(
          keyName,
          availableKeys[keyName],
          searchTerm,
          searchNumber,
        ),
      );

      // Auto-expand all filtered keys when searching
      const keyIds = keys.map((name) => availableKeys[name].id);
      setExpandedKeys(keyIds);
    } else {
      // When search is cleared, collapse everything
      setExpandedKeys([]);
    }

    // Sort keys
    keys = sortKeys(keys, availableKeys, sortColumn, sortOrder);

    // When editing, move keys with INITIAL selected values to the top
    if (
      editingIndex !== null &&
      Object.keys(initialEditSelections).length > 0
    ) {
      keys = partitionKeysBySelection(
        keys,
        availableKeys,
        initialEditSelections,
      );
    }

    return keys;
  }, [
    availableKeys,
    searchTerm,
    sortColumn,
    sortOrder,
    editingIndex,
    initialEditSelections,
  ]);

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortOrder('asc');
      }
    },
    [sortColumn],
  );

  const getSortIcon = useCallback(
    (column: SortColumn) => {
      if (sortColumn !== column) {
        return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
      }
      return sortOrder === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5 text-blue" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-blue" />
      );
    },
    [sortColumn, sortOrder],
  );

  const toggleKeyExpansion = useCallback((keyId: number) => {
    setExpandedKeys((prev) =>
      prev.includes(keyId) ? prev.filter((k) => k !== keyId) : [...prev, keyId],
    );
  }, []);

  const toggleValueSelection = useCallback(
    (keyId: number, valueId: number, event?: React.MouseEvent) => {
      if (event && (event.target as HTMLElement).tagName !== 'INPUT') {
        return;
      }

      setSelectedKeyValues((prev) => {
        const keySelections = prev[keyId] || {};
        return {
          ...prev,
          [keyId]: {
            ...keySelections,
            [valueId]: !keySelections[valueId],
          },
        };
      });
    },
    [],
  );

  const toggleKeySelection = useCallback(
    (keyId: number) => {
      if (!availableKeys) {
        return;
      }

      const keyName = Object.keys(availableKeys).find(
        (name) => availableKeys[name].id === keyId,
      );
      if (!keyName) {
        return;
      }

      const key = availableKeys[keyName];
      const keySelections = selectedKeyValues[keyId] || {};
      const allSelected = key.values.every((v) => keySelections[v.id]);

      setSelectedKeyValues((prev) => {
        const newKeySelections: Record<number, boolean> = {};
        key.values.forEach((v) => {
          newKeySelections[v.id] = !allSelected;
        });
        return {
          ...prev,
          [keyId]: newKeySelections,
        };
      });
    },
    [availableKeys, selectedKeyValues],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!availableKeys) {
        return;
      }

      const newSelectedKeyValues: Record<number, Record<number, boolean>> = {};
      filteredAndSortedKeys.forEach((keyName) => {
        const key = availableKeys[keyName];
        const keySelections: Record<number, boolean> = {};
        key.values.forEach((v) => {
          keySelections[v.id] = checked;
        });
        newSelectedKeyValues[key.id] = keySelections;
      });
      setSelectedKeyValues(newSelectedKeyValues);
    },
    [filteredAndSortedKeys, availableKeys],
  );

  const allFilteredKeysSelected = useMemo(() => {
    if (!availableKeys) {
      return false;
    }

    return (
      filteredAndSortedKeys.length > 0 &&
      filteredAndSortedKeys.every((keyName) => {
        const key = availableKeys[keyName];
        const keySelections = selectedKeyValues[key.id];
        return keySelections && key.values.every((v) => keySelections[v.id]);
      })
    );
  }, [filteredAndSortedKeys, availableKeys, selectedKeyValues]);

  const someFilteredKeysSelected = useMemo(() => {
    if (!availableKeys) {
      return false;
    }

    return (
      filteredAndSortedKeys.some((keyName) => {
        const key = availableKeys[keyName];
        const keySelections = selectedKeyValues[key.id];
        return keySelections && key.values.some((v) => keySelections[v.id]);
      }) && !allFilteredKeysSelected
    );
  }, [
    filteredAndSortedKeys,
    availableKeys,
    selectedKeyValues,
    allFilteredKeysSelected,
  ]);

  const handleExpandAll = useCallback(() => {
    if (!availableKeys) {
      return;
    }
    const keyIds = filteredAndSortedKeys.map((name) => availableKeys[name].id);
    setExpandedKeys(keyIds);
  }, [filteredAndSortedKeys, availableKeys]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  const handleAddClick = useCallback(() => {
    setEditingIndex(null);
    setSelectedKeyValues({});
    setInitialEditSelections({});
    setShowSearchAndList(true);
    setExpandedKeys([]);
    setSearchTerm('');

    setTimeout(() => {
      searchBarRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, []);

  const handleApply = useCallback(() => {
    // Get checked parameter PIDs
    const checkedPids = parameters.filter((p) => p.checked).map((p) => p.pid);
    if (checkedPids.length === 0) {
      alert('Please select at least one PID');
      return;
    }

    // Check if PIDs were modified
    const currentCheckedPids = [...checkedPids].sort();
    const initialPids = [...initialPidConfig].sort();
    const pidsModified =
      currentCheckedPids.length !== initialPids.length ||
      currentCheckedPids.some((pid, index) => pid !== initialPids[index]);

    // Search and List is NOT shown - only update PIDs if modified
    if (!showSearchAndList) {
      if (pidsModified && configuredCKVs.length > 0) {
        const updatedConfigs = configuredCKVs.map((config) => ({
          ...config,
          pidConfig: checkedPids,
        }));
        updateConfiguredKeyValues(moduleId, instanceId, updatedConfigs);
        // Update module parameters in store
        updateModuleParameters(moduleId, parameters);
        // Update initial PID config to reflect the new state
        setInitialPidConfig(checkedPids);
      }
      return;
    }

    // Search and List IS shown - follow current implementation
    if (!availableKeys) {
      return;
    }

    const selectedPerKey = groupSelectedValuesByKey(
      selectedKeyValues,
      availableKeys,
    );

    if (selectedPerKey.length === 0) {
      alert('Please select at least one value');
      return;
    }

    const combinations = generateCartesianProduct(selectedPerKey);

    const newConfigs: ConfiguredCkv[] = combinations.map((keyValuePairs) => ({
      keyValuePairs,
      pidConfig: checkedPids,
    }));

    // Get existing configs (exclude the one being edited)
    const existingConfigs =
      editingIndex !== null
        ? configuredCKVs.filter((_, i) => i !== editingIndex)
        : configuredCKVs;

    // Check for duplicates using IDs
    const uniqueNewConfigs: ConfiguredCkv[] = [];
    newConfigs.forEach((newConfig) => {
      const newConfigStr = newConfig.keyValuePairs
        .map((p) => `${p.key.id}:${p.value.id}`)
        .sort()
        .join('|');

      const isDuplicate = existingConfigs.some((existingConfig) => {
        const existingConfigStr = existingConfig.keyValuePairs
          .map((p) => `${p.key.id}:${p.value.id}`)
          .sort()
          .join('|');
        return existingConfigStr === newConfigStr;
      });

      if (!isDuplicate) {
        uniqueNewConfigs.push(newConfig);
      }
    });

    if (uniqueNewConfigs.length === 0) {
      return;
    }

    // Update store using dedicated methods
    if (editingIndex !== null) {
      // Edit mode: Remove old entry first
      removeConfiguredKey(moduleId, instanceId, editingIndex);
    }

    // If PIDs were modified, update all existing configs with new pidConfig
    if (pidsModified && existingConfigs.length > 0) {
      const updatedExistingConfigs = existingConfigs.map((config) => ({
        ...config,
        pidConfig: checkedPids,
      }));
      updateConfiguredKeyValues(moduleId, instanceId, updatedExistingConfigs);
    }

    // Add new configurations
    uniqueNewConfigs.forEach((config) => {
      addConfiguredKey(moduleId, instanceId, config);
    });

    // Update module parameters in store if PIDs were modified
    if (pidsModified) {
      updateModuleParameters(moduleId, parameters);
    }

    // Reset UI state
    setSelectedKeyValues({});
    setEditingIndex(null);
    setInitialEditSelections({});
    setShowSearchAndList(false);
    setExpandedKeys([]);
    setSearchTerm('');
    // Update initial PID config to reflect the new state
    setInitialPidConfig(checkedPids);

    setTimeout(() => {
      configSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, [
    parameters,
    initialPidConfig,
    showSearchAndList,
    availableKeys,
    selectedKeyValues,
    editingIndex,
    configuredCKVs,
    updateConfiguredKeyValues,
    moduleId,
    instanceId,
    removeConfiguredKey,
    addConfiguredKey,
    updateModuleParameters,
  ]);

  const handleEditCKV = useCallback(
    (id: number) => {
      if (!availableKeys) {
        return;
      }

      const ckv = configuredCKVs[id];
      if (!ckv) {
        return;
      }

      setEditingIndex(id);

      const newSelectedValues: Record<number, Record<number, boolean>> = {};
      const keysToExpand: number[] = [];

      // Use the Key and KeyValue objects directly
      ckv.keyValuePairs.forEach((pair) => {
        if (!newSelectedValues[pair.key.id]) {
          newSelectedValues[pair.key.id] = {};
        }
        newSelectedValues[pair.key.id][pair.value.id] = true;
        if (!keysToExpand.includes(pair.key.id)) {
          keysToExpand.push(pair.key.id);
        }
      });

      // Update parameters based on the CKV's pidConfig
      if (ckv.pidConfig) {
        const pidConfigSet = new Set(ckv.pidConfig);
        const updatedParameters = parameters.map((param) => ({
          ...param,
          checked: pidConfigSet.has(param.pid),
        }));
        setParameters(updatedParameters);
      }

      setSelectedKeyValues(newSelectedValues);
      setInitialEditSelections(newSelectedValues);
      setExpandedKeys(keysToExpand);
      setShowSearchAndList(true);
      setSearchTerm('');

      setTimeout(() => {
        searchBarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [configuredCKVs, availableKeys, parameters],
  );

  const handleDeleteCKV = useCallback(
    (id: number) => {
      // Use dedicated remove method
      removeConfiguredKey(moduleId, instanceId, id);

      if (editingIndex === id && showSearchAndList) {
        setSelectedKeyValues({});
        setInitialEditSelections({});
        setExpandedKeys([]);
      }
    },
    [
      moduleId,
      instanceId,
      removeConfiguredKey,
      editingIndex,
      showSearchAndList,
    ],
  );

  const handleCancel = useCallback(() => {
    const hasSelections = Object.values(selectedKeyValues).some((v) => v);
    const isConfirmed: boolean = true;
    if (hasSelections) {
      // TODO: Notify and confirm from user
    }

    if (isConfirmed) {
      setShowSearchAndList(false);
      setEditingIndex(null);
      setSearchTerm('');
      setSelectedKeyValues({});
      setInitialEditSelections({});
      setExpandedKeys([]);
      setTimeout(() => {
        configSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [selectedKeyValues]);

  const configuredItems = useMemo(
    () =>
      configuredCKVs.map((ckv, index) => ({
        id: index,
        keyValuePairs: ckv.keyValuePairs,
        label: ckv.keyValuePairs
          .map((p) => `[${p.key.name}: ${p.value.name}]`)
          .join(' '),
      })),
    [configuredCKVs],
  );

  const sortedValues = useCallback(
    (key: CalibrationKey) => {
      if (
        editingIndex === null ||
        Object.keys(initialEditSelections).length === 0
      ) {
        return key.values;
      }

      const keySelections = initialEditSelections[key.id];
      if (!keySelections) {
        return key.values;
      }

      return [
        ...key.values.filter((v) => keySelections[v.id]),
        ...key.values.filter((v) => !keySelections[v.id]),
      ];
    },
    [editingIndex, initialEditSelections],
  );

  // Show empty state if no available keys
  if (!availableKeys) {
    return (
      <div className="flex items-center justify-center p-8">
        <div style={{color: 'var(--color-text-neutral-tertiary)'}}>
          No calibration keys available
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Configured CKVs Summary */}
      <div ref={configSectionRef}>
        <ConfigSummaryView
          isEditable={isEditable}
          items={configuredItems}
          onAddClick={handleAddClick}
          onDeleteItem={handleDeleteCKV}
          onEditItem={handleEditCKV}
          showEditIcon
          title="Configured CKVs"
        />
      </div>

      {/* CKV Parameters Section */}
      <CkvParametersSection
        isEditable={isEditable}
        onParametersChange={(params) => {
          // Update local state immediately for UI responsiveness
          setParameters(params);
        }}
        parameters={parameters}
      />

      {/* Search and List Section */}
      {showSearchAndList && (
        <>
          <div ref={searchBarRef} className="flex items-center gap-2">
            <div className="flex-1">
              <ArcSearchBar
                onSearchChange={setSearchTerm}
                placeholder="Search calibration keys or values..."
                searchTerm={searchTerm}
              />
            </div>
            <div className="flex gap-1">
              <IconButton
                aria-label="Expand All"
                icon={<ChevronDown className="h-5 w-5" />}
                onClick={handleExpandAll}
                title="Expand All"
                variant="ghost"
              />
              <IconButton
                aria-label="Collapse All"
                icon={<ChevronUp className="h-5 w-5" />}
                onClick={handleCollapseAll}
                title="Collapse All"
                variant="ghost"
              />
            </div>
          </div>

          <div
            className="overflow-hidden rounded border shadow-sm"
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              borderColor: 'var(--color-border-neutral-02)',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center border-b-2 px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border-neutral-02)',
                color: 'var(--color-text-neutral-primary)',
              }}
            >
              <span className="w-3.5"></span>
              <Checkbox
                aria-label="Select all keys"
                checked={allFilteredKeysSelected}
                className="ml-3"
                indeterminate={someFilteredKeysSelected}
                onChange={(e) =>
                  handleSelectAll((e.target as HTMLInputElement).checked)
                }
                size="sm"
              />
              <button
                className="ml-3 flex w-32 cursor-pointer select-none items-center gap-1 hover:text-blue"
                onClick={() => handleSort('id')}
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                <span>Key ID</span>
                {getSortIcon('id')}
              </button>
              <button
                className="ml-3 flex flex-1 cursor-pointer select-none items-center gap-1 text-left hover:text-blue"
                onClick={() => handleSort('name')}
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                <span>Key Name</span>
                {getSortIcon('name')}
              </button>
            </div>

            {/* Keys List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredAndSortedKeys.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12"
                  style={{color: 'var(--color-text-neutral-tertiary)'}}
                >
                  <div className="mb-3 text-4xl">🔍</div>
                  <p>No calibration keys or values match your search</p>
                </div>
              ) : (
                filteredAndSortedKeys.map((keyName) => {
                  const key = availableKeys[keyName];
                  const isExpanded = expandedKeys.includes(key.id);
                  const keySelections = selectedKeyValues[key.id] || {};
                  const allValuesSelected = key.values.every(
                    (v) => keySelections[v.id],
                  );
                  const someValuesSelected = key.values.some(
                    (v) => keySelections[v.id],
                  );

                  return (
                    <div
                      key={keyName}
                      className="border-b last:border-b-0"
                      style={{borderColor: 'var(--color-border-neutral-02)'}}
                    >
                      {/* Key Header */}
                      <div
                        className="flex cursor-pointer items-center px-3 py-2.5 transition-colors"
                        onClick={() => toggleKeyExpansion(key.id)}
                        onMouseEnter={(e) => {
                          if (!allValuesSelected) {
                            e.currentTarget.style.backgroundColor =
                              'var(--color-surface-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!allValuesSelected) {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }
                        }}
                        style={{
                          backgroundColor: allValuesSelected
                            ? 'var(--color-surface-info-subtle)'
                            : 'transparent',
                        }}
                      >
                        <span
                          className="w-3.5"
                          style={{color: 'var(--color-text-neutral-secondary)'}}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <input
                          ref={(input) => {
                            if (input) {
                              input.indeterminate =
                                !allValuesSelected && someValuesSelected;
                            }
                          }}
                          aria-label={`Select ${keyName}`}
                          checked={allValuesSelected}
                          className="ml-3 h-4 w-4 cursor-pointer"
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleKeySelection(key.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          type="checkbox"
                        />
                        <div
                          className="ml-3 w-32 font-mono text-sm"
                          style={{color: 'var(--color-text-neutral-secondary)'}}
                        >
                          {ConvertNumberToHexString(key.id) || key.id}
                        </div>
                        <div
                          className="ml-3 flex-1 text-sm font-medium"
                          style={{color: 'var(--color-text-neutral-primary)'}}
                        >
                          {keyName}
                        </div>
                      </div>

                      {/* Values Container */}
                      {isExpanded && (
                        <div
                          style={{
                            backgroundColor: 'var(--color-surface-primary)',
                          }}
                        >
                          {sortedValues(key).map((value) => {
                            const keySelections =
                              selectedKeyValues[key.id] || {};
                            return (
                              <div
                                key={value.id}
                                className="flex items-center gap-3 border-t px-3 py-2 pl-16 transition-colors"
                                style={{
                                  backgroundColor: keySelections[value.id]
                                    ? 'var(--color-surface-info-subtle)'
                                    : 'transparent',
                                  borderColor: 'var(--color-border-neutral-03)',
                                }}
                              >
                                <Checkbox
                                  aria-label={`Select ${value.name}`}
                                  checked={keySelections[value.id] || false}
                                  onChange={(e) =>
                                    toggleValueSelection(
                                      key.id,
                                      value.id,
                                      e as any,
                                    )
                                  }
                                  size="sm"
                                />
                                <div
                                  className="w-32 font-mono text-sm"
                                  style={{
                                    color:
                                      'var(--color-text-neutral-secondary)',
                                  }}
                                >
                                  {ConvertNumberToHexString(value.id) ||
                                    value.id}
                                </div>
                                <div
                                  className="flex-1 text-sm"
                                  style={{
                                    color: 'var(--color-text-neutral-primary)',
                                  }}
                                >
                                  {value.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Apply/Cancel Buttons - Show if there are existing configs OR search/list is shown */}
      {(configuredCKVs.length > 0 || showSearchAndList) && isEditable && (
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
