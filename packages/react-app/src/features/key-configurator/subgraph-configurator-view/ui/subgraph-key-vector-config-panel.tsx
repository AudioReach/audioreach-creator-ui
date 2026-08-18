/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useRef, useState} from 'react';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit,
  Plus,
  Trash2,
} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';

import ArcSearchBar from '~shared/controls/arc-search-bar';
import type {
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {useSubgraphConfigStore} from '../../model/subgraph-config-store';

import type {ConfiguredSubgraphKeyValue} from './subgraph-config.types';

interface SubgraphKeyVectorConfigPanelProps {
  isEditable: boolean;
  subgraphId: number;
}

export function SubgraphKeyVectorConfigPanel({
  isEditable,
  subgraphId,
}: SubgraphKeyVectorConfigPanelProps) {
  // Get store state
  const availableKeys = useSubgraphConfigStore((state) => state.availableKeys);
  const configuredKeyValuesArray = useSubgraphConfigStore(
    (state) => state.configuredKeyValues,
  );

  // Get store actions
  const addConfiguredKey = useSubgraphConfigStore(
    (state) => state.addConfiguredKey,
  );
  const updateConfiguredKeyValues = useSubgraphConfigStore(
    (state) => state.updateConfiguredKeyValues,
  );

  // Get configured key values for current subgraph
  const configuredKeyValues = useMemo(() => {
    const subgraph = configuredKeyValuesArray.find(
      (c) => c.subgraphId === subgraphId,
    );
    const result = subgraph?.keyValueList || [];
    return result;
  }, [configuredKeyValuesArray, subgraphId]);

  const availableGraphKeys = useMemo(
    () => availableKeys || {},
    [availableKeys],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [showKeysList, setShowKeysList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>(
    {},
  ); // keyId -> valueId
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [initialEditKeys, setInitialEditKeys] = useState<Set<number>>(
    new Set(),
  );
  const [initialEditValues, setInitialEditValues] = useState<
    Record<number, number>
  >({});
  const configSectionRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Get all key names
  const allKeyNames = Object.keys(availableGraphKeys);

  // Filter keys based on search term and auto-expand if values match
  const filteredKeyNames = useMemo(() => {
    if (!searchTerm) {
      return allKeyNames;
    }

    const searchLower = searchTerm.toLowerCase();
    const searchAsNumber = ConvertStringToNumber(searchTerm);
    const newExpandedKeys = new Set(expandedKeys);

    const filtered = allKeyNames.filter((keyName) => {
      const key = availableGraphKeys[keyName];

      // Search in key name
      if (keyName.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in key ID (numeric comparison or hex string match)
      if (searchAsNumber !== null && key.id === searchAsNumber) {
        return true;
      }
      const keyIdHex = ConvertNumberToHexString(key.id);
      if (keyIdHex && keyIdHex.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in value names or value IDs
      const hasMatchingValue = key.values.some((v) => {
        if (v.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Numeric comparison
        if (searchAsNumber !== null && v.id === searchAsNumber) {
          return true;
        }
        // Hex string match
        const valueIdHex = ConvertNumberToHexString(v.id);
        return valueIdHex && valueIdHex.toLowerCase().includes(searchLower);
      });

      // Auto-expand keys with matching values
      if (hasMatchingValue) {
        newExpandedKeys.add(key.id);
      }

      return hasMatchingValue;
    });

    // Update expanded keys if search found matching values
    if (searchTerm && newExpandedKeys.size !== expandedKeys.size) {
      setExpandedKeys(newExpandedKeys);
    }

    return filtered;
  }, [searchTerm, allKeyNames, expandedKeys, availableGraphKeys]);

  // Sort keys and move configured keys to top when editing (based on initial selections)
  const sortedKeyNames = useMemo(() => {
    let sorted = [...filteredKeyNames];

    if (sortColumn) {
      sorted = sorted.sort((a, b) => {
        const keyA = availableGraphKeys[a];
        const keyB = availableGraphKeys[b];

        if (sortColumn === 'id') {
          // Numeric comparison for IDs
          const diff = keyA.id - keyB.id;
          return sortOrder === 'asc' ? diff : -diff;
        } else {
          // String comparison for names
          const compareA = a.toLowerCase();
          const compareB = b.toLowerCase();
          if (compareA < compareB) {
            return sortOrder === 'asc' ? -1 : 1;
          }
          if (compareA > compareB) {
            return sortOrder === 'asc' ? 1 : -1;
          }
          return 0;
        }
      });
    }

    // When editing, move INITIAL configured keys to the top (one-time sort)
    if (isEditing && initialEditKeys.size > 0) {
      const configuredInFiltered = sorted.filter((keyName) =>
        initialEditKeys.has(availableGraphKeys[keyName].id),
      );
      const notConfiguredInFiltered = sorted.filter(
        (keyName) => !initialEditKeys.has(availableGraphKeys[keyName].id),
      );
      sorted = [...configuredInFiltered, ...notConfiguredInFiltered];
    }

    return sorted;
  }, [
    filteredKeyNames,
    sortColumn,
    sortOrder,
    availableGraphKeys,
    isEditing,
    initialEditKeys,
  ]);

  // Format configured key values for display
  const configDisplayText = useMemo(() => {
    if (configuredKeyValues.length === 0) {
      return '';
    }
    return configuredKeyValues
      .map((kv) => `[${kv.keyInfo.name}: ${kv.valueInfo.name}]`)
      .join('\n');
  }, [configuredKeyValues]);

  const handleAddClick = () => {
    setShowKeysList(true);
    setIsEditing(false);
    setSearchTerm('');
    setSelectedKeys(new Set());
    setSelectedValues({});
    setExpandedKeys(new Set());
    setInitialEditKeys(new Set());
    setInitialEditValues({});
  };

  const handleEditClick = () => {
    setShowKeysList(true);
    setIsEditing(true);
    setSearchTerm('');

    // Load configured keys into selection state
    const keys = new Set(configuredKeyValues.map((kv) => kv.keyInfo.id));
    const values: Record<number, number> = {};
    configuredKeyValues.forEach((kv) => {
      values[kv.keyInfo.id] = kv.valueInfo.id;
    });

    setSelectedKeys(keys);
    setSelectedValues(values);
    setExpandedKeys(keys);
    // Store initial keys and values for stable sorting
    setInitialEditKeys(keys);
    setInitialEditValues(values);

    // Scroll to keys list section
    setTimeout(() => {
      searchBarRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      updateConfiguredKeyValues(subgraphId, []);
      // Clear selections if in edit mode
      if (showKeysList) {
        setSelectedKeys(new Set());
        setSelectedValues({});
        setExpandedKeys(new Set());
        setInitialEditKeys(new Set());
        setInitialEditValues({});
      }
    }
  };

  const handleKeyCheckboxChange = (keyId: number, checked: boolean) => {
    const newSelectedKeys = new Set(selectedKeys);
    if (checked) {
      newSelectedKeys.add(keyId);
    } else {
      newSelectedKeys.delete(keyId);
      // Clear selected value for this key
      const newSelectedValues = {...selectedValues};
      delete newSelectedValues[keyId];
      setSelectedValues(newSelectedValues);
    }
    setSelectedKeys(newSelectedKeys);
  };

  const handleSelectAllKeys = (checked: boolean) => {
    if (checked) {
      const keyIds = filteredKeyNames.map(
        (keyName) => availableGraphKeys[keyName].id,
      );
      setSelectedKeys(new Set(keyIds));
      setExpandedKeys(new Set(keyIds));
    } else {
      setSelectedKeys(new Set());
      setSelectedValues({});
      setExpandedKeys(new Set());
    }
  };

  const handleValueSelect = (keyId: number, valueId: number) => {
    // Auto-select the key if not already selected
    if (!selectedKeys.has(keyId)) {
      setSelectedKeys(new Set([...selectedKeys, keyId]));
    }

    setSelectedValues({
      ...selectedValues,
      [keyId]: valueId,
    });
  };

  const toggleKeyExpansion = (keyId: number) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(keyId)) {
      newExpanded.delete(keyId);
    } else {
      newExpanded.add(keyId);
    }
    setExpandedKeys(newExpanded);
  };

  const handleExpandAll = () => {
    const keyIds = filteredKeyNames.map(
      (keyName) => availableGraphKeys[keyName].id,
    );
    setExpandedKeys(new Set(keyIds));
  };

  const handleCollapseAll = () => {
    setExpandedKeys(new Set());
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
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

  const handleApply = () => {
    // Build configuration from selected keys and values
    const newConfigs: ConfiguredSubgraphKeyValue[] = [];

    selectedKeys.forEach((keyId) => {
      const valueId = selectedValues[keyId];
      if (valueId !== undefined) {
        // Find the key by ID
        const keyEntry = Object.entries(availableGraphKeys).find(
          ([_, key]) => key.id === keyId,
        );
        if (keyEntry) {
          const [keyName, key] = keyEntry;
          const value = key.values.find((v) => v.id === valueId);
          if (value) {
            newConfigs.push({
              keyInfo: {id: key.id, name: keyName},
              valueInfo: {id: value.id, name: value.name},
            });
          }
        }
      }
    });

    if (newConfigs.length === 0) {
      alert('Please select at least one key-value pair.');
      return;
    }

    // In edit mode, clear existing configs first
    if (isEditing) {
      updateConfiguredKeyValues(subgraphId, []);
    }

    // Add new configurations using the store's addConfiguredKey method
    newConfigs.forEach((config) => {
      addConfiguredKey(subgraphId, config);
    });

    setShowKeysList(false);
    setIsEditing(false);
    setSearchTerm('');
    setSelectedKeys(new Set());
    setSelectedValues({});
    setExpandedKeys(new Set());
    setInitialEditKeys(new Set());
    setInitialEditValues({});
  };

  const handleCancel = () => {
    const hasSelections =
      selectedKeys.size > 0 || Object.keys(selectedValues).length > 0;
    if (hasSelections) {
      // if (
      //   window.confirm(
      //     "Are you sure you want to cancel? All selections will be lost.",
      //   )
      // )
      {
        setShowKeysList(false);
        setIsEditing(false);
        setSearchTerm('');
        setSelectedKeys(new Set());
        setSelectedValues({});
        setExpandedKeys(new Set());
        setInitialEditKeys(new Set());
        setInitialEditValues({});
        // Scroll to configuration section
        setTimeout(() => {
          configSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
      }
    } else {
      setShowKeysList(false);
      setIsEditing(false);
      setSearchTerm('');
      setInitialEditKeys(new Set());
      setInitialEditValues({});
      // Scroll to configuration section
      setTimeout(() => {
        configSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  };

  const allFilteredKeysSelected =
    filteredKeyNames.length > 0 &&
    filteredKeyNames.every((keyName) =>
      selectedKeys.has(availableGraphKeys[keyName].id),
    );
  const someFilteredKeysSelected =
    filteredKeyNames.some((keyName) =>
      selectedKeys.has(availableGraphKeys[keyName].id),
    ) && !allFilteredKeysSelected;

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* Configuration Key Section */}
      <div
        ref={configSectionRef}
        className="rounded border p-4"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border-neutral-02)',
        }}
      >
        <label
          className="mb-2 block text-sm font-medium"
          style={{color: 'var(--color-text-neutral-primary)'}}
        >
          Subgraph Key Vector
        </label>
        <div className="flex items-center gap-2">
          <div
            className="min-h-[40px] flex-1 whitespace-pre-line rounded border p-3 text-left text-sm"
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              borderColor: 'var(--color-border-neutral-02)',
              color: 'var(--color-text-neutral-primary)',
            }}
          >
            {configDisplayText || (
              <span style={{color: 'var(--color-text-neutral-tertiary)'}}>
                Configure subgraph key vector
              </span>
            )}
          </div>
          {configuredKeyValues.length === 0 ? (
            isEditable && (
              <Button
                className="inline-flex items-center gap-1.5"
                emphasis="primary"
                onClick={handleAddClick}
                startIcon={Plus}
                title="Add configuration"
                variant="fill"
              >
                Add
              </Button>
            )
          ) : (
            <>
              {isEditable && (
                <IconButton
                  aria-label="Edit"
                  icon={<Edit />}
                  onClick={handleEditClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'var(--color-border-info)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--color-background-support-info)',
                  }}
                  title="Edit configuration"
                  variant="ghost"
                />
              )}
              {isEditable && (
                <IconButton
                  aria-label="Delete"
                  icon={<Trash2 style={{color: 'red'}} />}
                  onClick={handleDeleteClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'red';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-info)',
                  }}
                  title="Delete configuration"
                  variant="ghost"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Search Container */}
      {showKeysList && (
        <div ref={searchBarRef} className="flex items-center gap-2">
          <div className="flex-1">
            <ArcSearchBar
              onSearchChange={setSearchTerm}
              placeholder="Search keys or values..."
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
      )}

      {/* Keys List */}
      {showKeysList && (
        <div
          className="overflow-hidden rounded border shadow-sm"
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            borderColor: 'var(--color-border-neutral-02)',
          }}
        >
          {/* List Header */}
          <div
            className="sticky top-0 z-10 flex items-center gap-3 border-b-2 px-3 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border-neutral-02)',
              color: 'var(--color-text-neutral-primary)',
            }}
          >
            <Checkbox
              aria-label="Select all keys"
              checked={allFilteredKeysSelected}
              indeterminate={someFilteredKeysSelected}
              onCheckedChange={(checked) => handleSelectAllKeys(checked)}
              size="sm"
            />
            <button
              className="flex w-32 cursor-pointer select-none items-center gap-1 hover:text-blue"
              onClick={() => handleSort('id')}
              style={{color: 'var(--color-text-neutral-primary)'}}
            >
              <span>Key ID</span>
              {getSortIcon('id')}
            </button>
            <button
              className="flex flex-1 cursor-pointer select-none items-center gap-1 text-left hover:text-blue"
              onClick={() => handleSort('name')}
              style={{color: 'var(--color-text-neutral-primary)'}}
            >
              <span>Key Name</span>
              {getSortIcon('name')}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[50vh] overflow-y-auto">
            {sortedKeyNames.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                style={{color: 'var(--color-text-neutral-tertiary)'}}
              >
                <div className="mb-3 text-4xl">🔍</div>
                <p>No keys or values match your search</p>
              </div>
            ) : (
              sortedKeyNames.map((keyName) => {
                const key = availableGraphKeys[keyName];
                const isExpanded = expandedKeys.has(key.id);
                const isKeySelected = selectedKeys.has(key.id);
                const hasSelectedValue = selectedValues[key.id] !== undefined;

                return (
                  <div
                    key={keyName}
                    className="border-b last:border-b-0"
                    style={{borderColor: 'var(--color-border-neutral-01)'}}
                  >
                    {/* Key Header */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors"
                      onClick={() => toggleKeyExpansion(key.id)}
                      onMouseEnter={(e) => {
                        if (!hasSelectedValue) {
                          e.currentTarget.style.backgroundColor =
                            'var(--color-surface-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasSelectedValue) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      style={{
                        backgroundColor: hasSelectedValue
                          ? 'var(--color-surface-secondary)'
                          : 'transparent',
                        borderColor: 'var(--color-border-neutral-01)',
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
                      <Checkbox
                        aria-label={`Select ${keyName}`}
                        checked={isKeySelected}
                        onCheckedChange={(checked) => {
                          handleKeyCheckboxChange(key.id, checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                      <div
                        className="w-32 font-mono text-sm"
                        style={{color: 'var(--color-text-neutral-secondary)'}}
                      >
                        {ConvertNumberToHexString(key.id) || key.id}
                      </div>
                      <div
                        className="flex-1 text-sm font-medium"
                        style={{color: 'var(--color-text-neutral-primary)'}}
                      >
                        {keyName}
                      </div>
                    </div>

                    {/* Values Container */}
                    {isExpanded && (
                      <RadioGroup
                        className="w-full gap-0 [&>*]:!mb-0 [&>*]:!pb-0"
                        onChange={(
                          event: React.FormEvent<HTMLFieldSetElement>,
                        ) => {
                          const target = event.target as HTMLInputElement;
                          if (target.value) {
                            handleValueSelect(
                              key.id,
                              parseInt(target.value, 10),
                            );
                          }
                        }}
                        size="sm"
                        style={{
                          backgroundColor: 'var(--color-surface-primary)',
                          gap: 0,
                        }}
                        value={selectedValues[key.id]?.toString() || ''}
                      >
                        {/* Sort values: INITIAL selected values first when editing */}
                        {(() => {
                          let sortedValues = [...key.values];
                          if (
                            isEditing &&
                            initialEditValues[key.id] !== undefined
                          ) {
                            const selectedValue = sortedValues.find(
                              (v) => v.id === initialEditValues[key.id],
                            );
                            const otherValues = sortedValues.filter(
                              (v) => v.id !== initialEditValues[key.id],
                            );
                            sortedValues = selectedValue
                              ? [selectedValue, ...otherValues]
                              : sortedValues;
                          }
                          return sortedValues.map((value) => {
                            const isValueSelected =
                              selectedValues[key.id] === value.id;
                            return (
                              <div
                                key={value.id}
                                className="flex items-center gap-3 border-t px-3 py-2 pl-16 transition-colors"
                                style={{
                                  backgroundColor: isValueSelected
                                    ? 'var(--color-surface-secondary)'
                                    : 'transparent',
                                  borderColor: 'var(--color-border-neutral-01)',
                                }}
                              >
                                <Radio
                                  aria-label={`Select ${value.name}`}
                                  style={{marginBottom: 0, paddingBottom: 0}}
                                  value={value.id.toString()}
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
                          });
                        })()}
                      </RadioGroup>
                    )}
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
            disabled={Object.keys(selectedValues).length === 0}
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
