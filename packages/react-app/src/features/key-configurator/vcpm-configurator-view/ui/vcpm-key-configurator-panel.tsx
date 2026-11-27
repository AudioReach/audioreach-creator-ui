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

import {logger} from '~shared/lib/logger';
import type {
  ConfiguredCkv,
  GraphKey,
  KeyValue,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {ConfigSummaryView} from '../../config-summary-view';
import {
  generateCartesianProduct,
  getActiveSearchToken,
  groupSelectedValuesByKey,
  matchesSearchTerm,
  partitionKeysBySelection,
  resolveGraphKeyAndValue,
  resolveSelectedPairs,
  sortKeys,
} from '../../lib/ckv-picker-selection';
import {formatCkvEntry} from '../../module-configurator-view/lib/ckv-display-format';
import {
  type CkvSearchDiagnostic,
  type CkvSearchSuggestion,
  getCkvSearchSuggestions,
  resolveCkvSearchInput,
} from '../../module-configurator-view/lib/ckv-search-resolver';
import {tokenizeKvSearchInput} from '../../module-configurator-view/lib/tokenize-kv-search-input';
import {CkvSearchDiagnostics} from '../../ui/ckv-search-diagnostics';
import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '../../ui/kv-vector-editor';

export interface VcpmKeyConfiguratorPanelProps {
  addVcpmCkvs: (valueSystemIdCombinations: string[][]) => Promise<boolean>;
  configuredCkvs: ConfiguredCkv[];
  deleteVcpmCkv: (ckvSystemId: string) => Promise<boolean>;
  isEditable: boolean;
  voiceKeys: Record<string, GraphKey>;
}

async function copyCkvEntry(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    logger.error('VCPM key entry copy failed', {
      action: 'copy_ckv_entry',
      component: 'VcpmKeyConfiguratorPanel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export function VcpmKeyConfiguratorPanel({
  addVcpmCkvs,
  configuredCkvs,
  deleteVcpmCkv,
  isEditable,
  voiceKeys,
}: VcpmKeyConfiguratorPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedKeyValues, setSelectedKeyValues] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [pickerBoxText, setPickerBoxText] = useState('');
  const [diagnostics, setDiagnostics] = useState<CkvSearchDiagnostic[]>([]);
  const availableKeysTableRef = useRef<HTMLDivElement | null>(null);

  const resetPickerState = useCallback(() => {
    setSelectedKeyValues({});
    setExpandedKeys([]);
    setPickerBoxText('');
    setDiagnostics([]);
  }, []);

  useEffect(() => {
    if (showPicker) {
      availableKeysTableRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [showPicker]);

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
        return <ArrowUpDown className="h-3.5 w-3.5" />;
      }
      return sortOrder === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      );
    },
    [sortColumn, sortOrder],
  );

  const toggleKeyExpansion = useCallback((keyId: number) => {
    setExpandedKeys((prev) =>
      prev.includes(keyId)
        ? prev.filter((id) => id !== keyId)
        : [...prev, keyId],
    );
  }, []);

  const resolvedPickerSelection = useMemo(
    () => resolveSelectedPairs(selectedKeyValues, voiceKeys),
    [selectedKeyValues, voiceKeys],
  );

  const confirmedSelectionText = useMemo(
    () =>
      resolvedPickerSelection.length === 0
        ? ''
        : formatCkvEntry(resolvedPickerSelection),
    [resolvedPickerSelection],
  );

  const applyPickerSelection = useCallback(
    (next: Record<number, Record<number, boolean>>) => {
      setSelectedKeyValues(next);
      const pairs = resolveSelectedPairs(next, voiceKeys);
      setPickerBoxText(pairs.length === 0 ? '' : formatCkvEntry(pairs));
    },
    [voiceKeys],
  );

  const toggleValueSelection = useCallback(
    (keyId: number, valueId: number) => {
      const keySelections = selectedKeyValues[keyId] || {};
      applyPickerSelection({
        ...selectedKeyValues,
        [keyId]: {
          ...keySelections,
          [valueId]: !keySelections[valueId],
        },
      });
    },
    [selectedKeyValues, applyPickerSelection],
  );

  const toggleKeySelection = useCallback(
    (key: GraphKey) => {
      const keySelections = selectedKeyValues[key.id] || {};
      const allSelected = key.values.every((v) => keySelections[v.id]);
      const nextSelections: Record<number, boolean> = {};
      key.values.forEach((v) => {
        nextSelections[v.id] = !allSelected;
      });
      applyPickerSelection({...selectedKeyValues, [key.id]: nextSelections});
    },
    [selectedKeyValues, applyPickerSelection],
  );

  const selectValue = useCallback(
    (keyId: number, valueId: number, valueName: string) => {
      const isAppendingConfirmedTerm =
        Boolean(confirmedSelectionText) &&
        pickerBoxText.startsWith(confirmedSelectionText);

      if (isAppendingConfirmedTerm) {
        const keySelections = selectedKeyValues[keyId] || {};
        applyPickerSelection({
          ...selectedKeyValues,
          [keyId]: {...keySelections, [valueId]: true},
        });
        return;
      }

      const next: Record<number, Record<number, boolean>> = {};
      Object.entries(selectedKeyValues).forEach(
        ([keyIdStr, valueSelections]) => {
          const existingKeyId = parseInt(keyIdStr, 10);
          if (existingKeyId === keyId) {
            next[existingKeyId] = {...valueSelections};
            return;
          }
          const retainedSelections = Object.fromEntries(
            Object.entries(valueSelections).filter(
              ([valueIdStr, isSelected]) => {
                if (!isSelected) {
                  return true;
                }
                const resolved = resolveGraphKeyAndValue(
                  voiceKeys,
                  existingKeyId,
                  parseInt(valueIdStr, 10),
                );
                return (
                  resolved?.value.name.toLowerCase() !== valueName.toLowerCase()
                );
              },
            ),
          );
          if (Object.keys(retainedSelections).length > 0) {
            next[existingKeyId] = retainedSelections;
          }
        },
      );
      next[keyId] = {...(next[keyId] ?? {}), [valueId]: true};
      applyPickerSelection(next);
    },
    [
      selectedKeyValues,
      applyPickerSelection,
      voiceKeys,
      confirmedSelectionText,
      pickerBoxText,
    ],
  );

  const applySelectionFromTokens = useCallback(
    (pairs: Array<{key: GraphKey; value: KeyValue}>) => {
      const next: Record<number, Record<number, boolean>> = {};
      pairs.forEach((pair) => {
        next[pair.key.id] = {
          ...(next[pair.key.id] ?? {}),
          [pair.value.id]: true,
        };
      });
      setSelectedKeyValues(next);
      setExpandedKeys(pairs.map((pair) => pair.key.id));
    },
    [],
  );

  const handlePickerBoxChange = useCallback(
    (value: string) => {
      setPickerBoxText(value);

      const isExtension =
        Boolean(confirmedSelectionText) &&
        value.startsWith(confirmedSelectionText);
      if (isExtension) {
        setDiagnostics([]);
        return;
      }

      if (!value.trim()) {
        setSelectedKeyValues({});
        setDiagnostics([]);
        return;
      }

      const tokens = tokenizeKvSearchInput(value);
      const {diagnostics: resolvedDiagnostics, resolved} =
        resolveCkvSearchInput(voiceKeys, tokens);
      applySelectionFromTokens(resolved);
      setDiagnostics(resolvedDiagnostics);
    },
    [voiceKeys, applySelectionFromTokens, confirmedSelectionText],
  );

  const pickerFilterText = useMemo(() => {
    if (
      confirmedSelectionText &&
      pickerBoxText.startsWith(confirmedSelectionText)
    ) {
      const extension = pickerBoxText
        .slice(confirmedSelectionText.length)
        .trim();
      return getActiveSearchToken(extension);
    }
    return '';
  }, [pickerBoxText, confirmedSelectionText]);

  const pickerSuggestionQueryText = useMemo(() => {
    if (
      confirmedSelectionText &&
      pickerBoxText.startsWith(confirmedSelectionText)
    ) {
      return pickerFilterText;
    }
    return getActiveSearchToken(pickerBoxText);
  }, [pickerBoxText, confirmedSelectionText, pickerFilterText]);

  const availableSuggestions = useMemo<
    Array<KvVectorEditorSuggestion<CkvSearchSuggestion>>
  >(
    () =>
      pickerSuggestionQueryText
        ? getCkvSearchSuggestions(voiceKeys, pickerSuggestionQueryText).map(
            (suggestion) => ({
              id: `${suggestion.key.id}:${suggestion.value.id}:${suggestion.kind}`,
              primaryText: suggestion.value.name,
              secondaryText: `Key: ${suggestion.key.name}`,
              value: suggestion,
            }),
          )
        : [],
    [voiceKeys, pickerSuggestionQueryText],
  );

  const handleSuggestionCommit = useCallback(
    (suggestion: CkvSearchSuggestion) => {
      selectValue(
        suggestion.key.id,
        suggestion.value.id,
        suggestion.value.name,
      );
    },
    [selectValue],
  );

  const filteredKeyNames = useMemo(() => {
    const searchNumber = ConvertStringToNumber(pickerFilterText);
    const keys =
      pickerFilterText === ''
        ? Object.keys(voiceKeys)
        : Object.keys(voiceKeys).filter((keyName) =>
            matchesSearchTerm(
              keyName,
              voiceKeys[keyName],
              pickerFilterText,
              searchNumber,
            ),
          );
    const sorted = sortKeys(keys, voiceKeys, sortColumn, sortOrder);
    return partitionKeysBySelection(sorted, voiceKeys, selectedKeyValues);
  }, [voiceKeys, pickerFilterText, sortColumn, sortOrder, selectedKeyValues]);

  const handleExpandAll = useCallback(() => {
    setExpandedKeys(filteredKeyNames.map((name) => voiceKeys[name].id));
  }, [filteredKeyNames, voiceKeys]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  const handleAddClick = useCallback(() => {
    setShowPicker(true);
    resetPickerState();
  }, [resetPickerState]);

  const handleDeleteCKV = useCallback(
    async (index: number) => {
      const systemId = configuredCkvs[index]?.systemId;
      if (!systemId) {
        return;
      }
      await deleteVcpmCkv(systemId);
    },
    [configuredCkvs, deleteVcpmCkv],
  );

  const handleCancel = useCallback(() => {
    setShowPicker(false);
    resetPickerState();
  }, [resetPickerState]);

  const hasPendingChange = resolvedPickerSelection.length > 0;

  const handleAdd = useCallback(async () => {
    const selectedPerKey = groupSelectedValuesByKey(
      selectedKeyValues,
      voiceKeys,
    );

    const combinations = generateCartesianProduct(selectedPerKey);

    const existingSignatures = new Set(
      configuredCkvs.map((ckv) =>
        ckv.keyValuePairs
          .map((pair) => `${pair.key.id}:${pair.value.id}`)
          .sort()
          .join('|'),
      ),
    );

    const valueSystemIdCombinations: string[][] = [];
    combinations.forEach((combo) => {
      const signature = combo
        .map((pair) => `${pair.key.id}:${pair.value.id}`)
        .sort()
        .join('|');
      if (existingSignatures.has(signature)) {
        return;
      }
      existingSignatures.add(signature);

      const resolvedPairs = combo
        .map((pair) =>
          resolveGraphKeyAndValue(voiceKeys, pair.key.id, pair.value.id),
        )
        .filter(
          (pair): pair is {key: GraphKey; value: KeyValue} => pair !== null,
        );

      if (resolvedPairs.length === 0) {
        return;
      }

      valueSystemIdCombinations.push(
        resolvedPairs.map((pair) => pair.value.systemId),
      );
    });

    if (valueSystemIdCombinations.length === 0) {
      setShowPicker(false);
      resetPickerState();
      return;
    }

    const success = await addVcpmCkvs(valueSystemIdCombinations);
    if (success) {
      setShowPicker(false);
      resetPickerState();
    }
  }, [
    selectedKeyValues,
    voiceKeys,
    configuredCkvs,
    addVcpmCkvs,
    resetPickerState,
  ]);

  const sortedValuesForKey = useCallback(
    (key: GraphKey) => {
      const keySelections = selectedKeyValues[key.id];
      if (!keySelections) {
        return key.values;
      }
      return [
        ...key.values.filter((v) => keySelections[v.id]),
        ...key.values.filter((v) => !keySelections[v.id]),
      ];
    },
    [selectedKeyValues],
  );

  const configuredItems = useMemo(
    () =>
      configuredCkvs.map((ckv, index) => ({
        id: index,
        keyValuePairs: ckv.keyValuePairs.map((pair) => ({
          key: {id: pair.key.id, name: pair.key.name},
          value: {id: pair.value.id, name: pair.value.name},
        })),
        label: formatCkvEntry(ckv.keyValuePairs),
      })),
    [configuredCkvs],
  );

  const handleDeleteFiltered = useCallback(
    async (ids: number[]) => {
      const systemIds = ids
        .map((id) => configuredCkvs[id]?.systemId)
        .filter((systemId): systemId is string => Boolean(systemId));
      if (systemIds.length === 0) {
        return;
      }
      await Promise.all(systemIds.map((systemId) => deleteVcpmCkv(systemId)));
    },
    [configuredCkvs, deleteVcpmCkv],
  );

  const onAddClick = isEditable ? handleAddClick : undefined;
  const onDeleteItem = isEditable
    ? (index: number) => {
        void handleDeleteCKV(index);
      }
    : undefined;
  const onDeleteFiltered = isEditable
    ? (ids: number[]) => {
        void handleDeleteFiltered(ids);
      }
    : undefined;
  const onCopyEntry = useCallback(
    (entryIndex: number) => {
      void copyCkvEntry(
        formatCkvEntry(configuredCkvs[entryIndex].keyValuePairs),
      );
    },
    [configuredCkvs],
  );

  const configSummary = (
    <ConfigSummaryView
      isActionsDisabled={showPicker}
      isEditable={isEditable}
      items={configuredItems}
      onAddClick={onAddClick}
      onCopyEntry={onCopyEntry}
      onDeleteFiltered={onDeleteFiltered}
      onDeleteItem={onDeleteItem}
      title="Configured Keys"
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {!showPicker && configSummary}

      {showPicker && (
        <>
          <KvVectorEditor
            ariaLabel="Search voice keys or values"
            clearable
            onSuggestionCommit={handleSuggestionCommit}
            onTextChange={handlePickerBoxChange}
            placeholder="Search voice keys or values..."
            suggestions={availableSuggestions}
            text={pickerBoxText}
            trailingControls={
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
            }
          />

          <CkvSearchDiagnostics diagnostics={diagnostics} />

          <div
            ref={availableKeysTableRef}
            className="bg-primary border-neutral-02 overflow-hidden rounded border shadow-sm"
          >
            <div className="bg-secondary border-neutral-02 text-neutral-primary sticky top-0 z-10 flex items-center border-b-2 px-3 py-2 text-sm font-semibold">
              <button
                className="hover:text-brand-primary text-neutral-primary ml-3 flex w-32 cursor-pointer items-center gap-1 select-none"
                onClick={() => handleSort('id')}
                type="button"
              >
                <span>Key ID</span>
                {getSortIcon('id')}
              </button>
              <button
                className="hover:text-brand-primary text-neutral-primary ml-3 flex flex-1 cursor-pointer items-center gap-1 text-left select-none"
                onClick={() => handleSort('name')}
                type="button"
              >
                <span>Key Name</span>
                {getSortIcon('name')}
              </button>
            </div>

            <div className="max-h-[35vh] overflow-y-auto">
              {filteredKeyNames.length === 0 ? (
                <div className="text-neutral-secondary flex flex-col items-center justify-center py-12">
                  <p>No voice keys or values match your search</p>
                </div>
              ) : (
                filteredKeyNames.map((keyName) => {
                  const key = voiceKeys[keyName];
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
                      className="border-neutral-02 border-b last:border-b-0"
                    >
                      <div
                        className={`flex items-center px-3 py-2.5 transition-colors ${
                          allValuesSelected
                            ? 'bg-support-info-subtle'
                            : 'bg-transparent'
                        }`}
                      >
                        <IconButton
                          aria-label={
                            isExpanded
                              ? `Collapse ${keyName}`
                              : `Expand ${keyName}`
                          }
                          icon={
                            isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )
                          }
                          onClick={() => toggleKeyExpansion(key.id)}
                          variant="ghost"
                        />
                        <Checkbox
                          aria-label={`Select ${keyName}`}
                          checked={allValuesSelected}
                          className="ml-3"
                          indeterminate={
                            someValuesSelected && !allValuesSelected
                          }
                          onCheckedChange={() => toggleKeySelection(key)}
                          size="sm"
                        />
                        <div className="text-neutral-secondary ml-3 w-32 font-mono text-sm">
                          {ConvertNumberToHexString(key.id) || key.id}
                        </div>
                        <div
                          className="text-neutral-primary ml-3 flex-1 cursor-pointer text-sm font-medium"
                          onClick={() => toggleKeyExpansion(key.id)}
                        >
                          {keyName}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-primary">
                          {sortedValuesForKey(key).map((value) => (
                            <div
                              key={value.id}
                              className={`border-neutral-03 flex items-center gap-3 border-t px-3 py-2 pl-16 transition-colors ${
                                keySelections[value.id]
                                  ? 'bg-support-info-subtle'
                                  : 'bg-transparent'
                              }`}
                            >
                              <Checkbox
                                aria-label={`Select ${value.name}`}
                                checked={Boolean(keySelections[value.id])}
                                onCheckedChange={() =>
                                  toggleValueSelection(key.id, value.id)
                                }
                                size="sm"
                              />
                              <div className="text-neutral-secondary w-32 font-mono text-sm">
                                {ConvertNumberToHexString(value.id) || value.id}
                              </div>
                              <div className="text-neutral-primary flex-1 text-sm">
                                {value.name}
                              </div>
                            </div>
                          ))}
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

      {showPicker && (
        <div className="flex justify-end gap-2">
          <Button
            emphasis="neutral"
            onClick={handleCancel}
            size="sm"
            variant="fill"
          >
            Cancel
          </Button>
          <Button
            disabled={!hasPendingChange}
            emphasis="primary"
            onClick={() => {
              void handleAdd();
            }}
            size="sm"
            variant="fill"
          >
            Add
          </Button>
        </div>
      )}

      {showPicker && configSummary}
    </div>
  );
}
