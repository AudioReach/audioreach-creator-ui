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

import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import {
  type CkvSearchDiagnostic,
  type CkvSearchSuggestion,
  formatCkvEntry,
  getCkvSearchSuggestions,
  type GraphDesignerStore,
  resolveCkvSearchInput,
  selectConfiguredCkvs,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {showToast} from '~shared/controls/global-toaster';
import type {KeyDisplayMode} from '~shared/lib/key-display-mode';
import {logger} from '~shared/lib/logger';
import type {
  ConfiguredCkv,
  GraphKey as CalibrationKey,
  KeyValue,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {ConfigSummaryView} from '../../../config-summary-view';
import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '../../../ui/kv-vector-editor';

import type {CkvParameter} from './calibration-keys-config.types';
import {transformParamDefinitionsToCKVParameters} from './ckv.mapper';
import {CkvParametersSection} from './ckv-parameters-section';

interface CalibrationKeysConfigPanelProps {
  ckvDisplayMode: KeyDisplayMode;
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
}

type ActiveCkvOperation = {type: 'add'} | {index: number; type: 'edit'} | null;

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
 * Isolates the token currently being typed out of a filter/search string that
 * may contain already-resolved tokens joined by `separator` (e.g. `+voi` once
 * a prior value-only token has resolved) — mirrors SGKV's caret-based active
 * token isolation (`getValueOnlyReplacementRange`) without needing caret
 * tracking, since this editor only supports appending at the end.
 */
const getActiveSearchToken = (text: string, separator: string): string => {
  const separatorIndex = text.lastIndexOf(separator);
  return separatorIndex < 0
    ? text.trim()
    : text.slice(separatorIndex + 1).trim();
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
 * preserved.
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

/**
 * Re-resolves a narrow `{id, name}` key/value pair produced by the Cartesian-product
 * helpers above into the full {@link CalibrationKey}/{@link KeyValue} shape required by
 * `ConfiguredCkv`, by matching on `id` against `availableCalibrationKeys` — the helpers
 * above intentionally stay widening-free, so this is the one place that re-attaches
 * `systemId` metadata.
 */
function resolveGraphKeyAndValue(
  availableCalibrationKeys: Record<string, CalibrationKey>,
  keyId: number,
  valueId: number,
): {key: CalibrationKey; value: KeyValue} | null {
  const key = Object.values(availableCalibrationKeys).find(
    (candidate) => candidate.id === keyId,
  );
  if (!key) {
    return null;
  }
  const value = key.values.find((candidate) => candidate.id === valueId);
  if (!value) {
    return null;
  }
  return {key, value};
}

function buildCkvSystemId(
  keyValuePairs: Array<{key: CalibrationKey; value: KeyValue}>,
): string {
  return keyValuePairs
    .map((pair) => `${pair.key.systemId}:${pair.value.systemId}`)
    .sort()
    .join('|');
}

async function copyCkvEntry(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    logger.error('Calibration key entry copy failed', {
      action: 'copy_ckv_entry',
      component: 'CalibrationKeysConfigPanel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function renderDiagnostic(diagnostic: CkvSearchDiagnostic, key: number) {
  if (diagnostic.code === 'unknown-token') {
    return (
      <div key={key}>
        Value &quot;{diagnostic.token}&quot; was not found for any key.
      </div>
    );
  }
  if (diagnostic.code === 'value-auto-resolved-by-key-id') {
    return (
      <div key={key}>
        {diagnostic.valueName} is ambiguous between{' '}
        {diagnostic.candidateKeyNames.join(', ')}; resolved to the lowest-ID
        key.
      </div>
    );
  }
  return (
    <div key={key}>
      Cannot assign distinct keys to tokens: {diagnostic.tokens.join(', ')}
    </div>
  );
}

export function CalibrationKeysConfigPanel({
  ckvDisplayMode,
  instanceSystemId,
  isEditable,
  moduleId: _moduleId,
}: CalibrationKeysConfigPanelProps) {
  const {
    availableCalibrationKeys,
    graphData,
    moduleDefinitionsBySystemId,
    removeConfiguredCkv,
    updateConfiguredCkvs,
  } = useGraphDesignerStoreShallow((state) => ({
    availableCalibrationKeys: state.availableCalibrationKeys,
    graphData: state.graphData,
    moduleDefinitionsBySystemId: state.moduleDefinitionsBySystemId,
    removeConfiguredCkv: state.removeConfiguredCkv,
    updateConfiguredCkvs: state.updateConfiguredCkvs,
  }));

  // selectConfiguredCkvs re-derives fresh CalibrationKey/KeyValue objects on every
  // call, so it must be memoized here rather than invoked inside the
  // useGraphDesignerStoreShallow selector itself — doing so there defeats
  // useShallow's comparison (new array/object identities every render) and
  // triggers React's "getSnapshot should be cached" infinite-loop warning.
  const configuredCkvs = useMemo(
    () =>
      selectConfiguredCkvs(
        {availableCalibrationKeys, graphData} as GraphDesignerStore,
        instanceSystemId,
      ),
    [availableCalibrationKeys, graphData, instanceSystemId],
  );

  const moduleDefinitionSystemId =
    graphData?.moduleInstances[instanceSystemId]?.moduleDefinitionSystemId;
  const paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[] = useMemo(
    () =>
      (moduleDefinitionSystemId !== undefined
        ? moduleDefinitionsBySystemId[moduleDefinitionSystemId]
            ?.paramDefinitionsSummaryInfo
        : undefined) ?? [],
    [moduleDefinitionSystemId, moduleDefinitionsBySystemId],
  );

  const baselineParameters = useMemo<CkvParameter[]>(() => {
    const baseline = transformParamDefinitionsToCKVParameters(
      paramDefinitionsSummaryInfo,
    );
    if (configuredCkvs.length === 0) {
      return baseline.map((param) => ({...param, checked: true}));
    }
    return baseline.map((param) => ({
      ...param,
      checked: configuredCkvs.some((ckv) => ckv.pidConfig.includes(param.pid)),
    }));
  }, [paramDefinitionsSummaryInfo, configuredCkvs]);

  const [parameters, setParameters] =
    useState<CkvParameter[]>(baselineParameters);
  const [activeOperation, setActiveOperation] =
    useState<ActiveCkvOperation>(null);
  const [selectedKeyValues, setSelectedKeyValues] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [pickerBoxText, setPickerBoxText] = useState('');
  const [diagnostics, setDiagnostics] = useState<CkvSearchDiagnostic[]>([]);
  const availableKeysTableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeOperation === null) {
      setParameters(baselineParameters);
    }
    // Resetting the active edit on instance switch (not on every baseline
    // recompute) is intentional — see brief requirement (e).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceSystemId]);

  const resetPickerState = useCallback(() => {
    setSelectedKeyValues({});
    setExpandedKeys([]);
    setPickerBoxText('');
    setDiagnostics([]);
  }, []);

  // Add/Edit opens a picker further down the panel — bring it into view so
  // the user isn't left looking at an unchanged scroll position.
  useEffect(() => {
    if (activeOperation !== null) {
      availableKeysTableRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeOperation]);

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

  const toggleValueSelection = useCallback((keyId: number, valueId: number) => {
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
  }, []);

  const toggleKeySelection = useCallback((key: CalibrationKey) => {
    setSelectedKeyValues((prev) => {
      const keySelections = prev[key.id] || {};
      const allSelected = key.values.every((v) => keySelections[v.id]);
      const nextSelections: Record<number, boolean> = {};
      key.values.forEach((v) => {
        nextSelections[v.id] = !allSelected;
      });
      return {...prev, [key.id]: nextSelections};
    });
  }, []);

  const resolvedPickerSelection = useMemo(() => {
    return Object.entries(selectedKeyValues).flatMap(
      ([keyIdStr, valueSelections]) => {
        const keyId = parseInt(keyIdStr, 10);
        return Object.entries(valueSelections)
          .filter(([, isSelected]) => isSelected)
          .map(([valueIdStr]) =>
            resolveGraphKeyAndValue(
              availableCalibrationKeys,
              keyId,
              parseInt(valueIdStr, 10),
            ),
          )
          .filter(
            (pair): pair is {key: CalibrationKey; value: KeyValue} =>
              pair !== null,
          );
      },
    );
  }, [selectedKeyValues, availableCalibrationKeys]);

  const confirmedSelectionText = useMemo(
    () => formatCkvEntry(resolvedPickerSelection, ckvDisplayMode),
    [resolvedPickerSelection, ckvDisplayMode],
  );

  // Selection → box: reflect the confirmed selection into the search field
  // whenever a checkbox toggle changes it (requirement 30).
  useEffect(() => {
    setPickerBoxText(confirmedSelectionText);
  }, [confirmedSelectionText]);

  const applySelectionFromTokens = useCallback(
    (pairs: Array<{key: CalibrationKey; value: KeyValue}>) => {
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

  // Box → selection: a keystroke either extends the confirmed-selection
  // prefix (treated as a live filter over the key/value tree) or replaces it
  // entirely (resolved against the full available key set, requirement 30 /
  // requirement 8 — no single-key lock, unlike SGKV's bracket editor).
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

      const separator = ckvDisplayMode === 'value-only' ? '+' : ' ';
      const tokens = value
        .split(separator)
        .map((token) => token.trim())
        .filter(Boolean);
      const {diagnostics: resolvedDiagnostics, resolved} =
        resolveCkvSearchInput(availableCalibrationKeys, tokens);
      applySelectionFromTokens(resolved);
      setDiagnostics(resolvedDiagnostics);
    },
    [
      availableCalibrationKeys,
      applySelectionFromTokens,
      confirmedSelectionText,
      ckvDisplayMode,
    ],
  );

  // The table filter only activates once a prior token is confirmed, and
  // then filters by the token currently being typed — not the raw extension
  // text, which would still contain the leading separator (e.g. `+`) right
  // after it's typed and could never match a key/value name.
  const pickerFilterText = useMemo(() => {
    if (
      confirmedSelectionText &&
      pickerBoxText.startsWith(confirmedSelectionText)
    ) {
      const separator = ckvDisplayMode === 'value-only' ? '+' : ' ';
      const extension = pickerBoxText
        .slice(confirmedSelectionText.length)
        .trim();
      return getActiveSearchToken(extension, separator);
    }
    return '';
  }, [pickerBoxText, confirmedSelectionText, ckvDisplayMode]);

  // Suggestions rank against the token currently being typed: the active
  // separator-delimited segment of the extension past a confirmed prefix, or
  // of the full box text when nothing is confirmed yet or the text was fully
  // replaced — so a resolved first token (e.g. `Level_0+`) doesn't swallow
  // the still-being-typed second token into one unmatchable query string
  // (parity with SGKV's caret-based active-token isolation).
  const pickerSuggestionQueryText = useMemo(() => {
    if (
      confirmedSelectionText &&
      pickerBoxText.startsWith(confirmedSelectionText)
    ) {
      return pickerFilterText;
    }
    const separator = ckvDisplayMode === 'value-only' ? '+' : ' ';
    return getActiveSearchToken(pickerBoxText, separator);
  }, [pickerBoxText, confirmedSelectionText, pickerFilterText, ckvDisplayMode]);

  const availableSuggestions = useMemo<
    Array<KvVectorEditorSuggestion<CkvSearchSuggestion>>
  >(
    () =>
      pickerSuggestionQueryText
        ? getCkvSearchSuggestions(
            availableCalibrationKeys,
            pickerSuggestionQueryText,
          ).map((suggestion) => ({
            id: `${suggestion.key.id}:${suggestion.value.id}:${suggestion.kind}`,
            primaryText: suggestion.value.name,
            secondaryText: `Key: ${suggestion.key.name}`,
            value: suggestion,
          }))
        : [],
    [availableCalibrationKeys, pickerSuggestionQueryText],
  );

  const handleSuggestionCommit = useCallback(
    (suggestion: CkvSearchSuggestion) => {
      toggleValueSelection(suggestion.key.id, suggestion.value.id);
    },
    [toggleValueSelection],
  );

  const filteredKeyNames = useMemo(() => {
    const searchNumber = ConvertStringToNumber(pickerFilterText);
    const keys =
      pickerFilterText === ''
        ? Object.keys(availableCalibrationKeys)
        : Object.keys(availableCalibrationKeys).filter((keyName) =>
            matchesSearchTerm(
              keyName,
              availableCalibrationKeys[keyName],
              pickerFilterText,
              searchNumber,
            ),
          );
    const sorted = sortKeys(
      keys,
      availableCalibrationKeys,
      sortColumn,
      sortOrder,
    );
    return partitionKeysBySelection(
      sorted,
      availableCalibrationKeys,
      selectedKeyValues,
    );
  }, [
    availableCalibrationKeys,
    pickerFilterText,
    sortColumn,
    sortOrder,
    selectedKeyValues,
  ]);

  const handleExpandAll = useCallback(() => {
    setExpandedKeys(
      filteredKeyNames.map((name) => availableCalibrationKeys[name].id),
    );
  }, [filteredKeyNames, availableCalibrationKeys]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  const handleAddClick = useCallback(() => {
    setActiveOperation({type: 'add'});
    resetPickerState();
    setParameters(
      baselineParameters.map((param) => ({...param, checked: true})),
    );
  }, [resetPickerState, baselineParameters]);

  const handleEditCKV = useCallback(
    (index: number) => {
      const ckv = configuredCkvs[index];
      if (!ckv) {
        return;
      }
      setActiveOperation({index, type: 'edit'});
      const nextSelections: Record<number, Record<number, boolean>> = {};
      ckv.keyValuePairs.forEach((pair) => {
        nextSelections[pair.key.id] = {
          ...(nextSelections[pair.key.id] ?? {}),
          [pair.value.id]: true,
        };
      });
      setSelectedKeyValues(nextSelections);
      setExpandedKeys(ckv.keyValuePairs.map((pair) => pair.key.id));
      setDiagnostics([]);
      setParameters(
        baselineParameters.map((param) => ({
          ...param,
          checked: ckv.pidConfig.includes(param.pid),
        })),
      );
    },
    [configuredCkvs, baselineParameters],
  );

  const handleDeleteCKV = useCallback(
    (index: number) => {
      removeConfiguredCkv(instanceSystemId, index);
    },
    [removeConfiguredCkv, instanceSystemId],
  );

  const handleCancel = useCallback(() => {
    setActiveOperation(null);
    resetPickerState();
    setParameters(baselineParameters);
  }, [resetPickerState, baselineParameters]);

  const handleApply = useCallback(() => {
    if (activeOperation === null) {
      return;
    }

    const chosenPids = parameters.filter((p) => p.checked).map((p) => p.pid);

    const selectedPerKey = groupSelectedValuesByKey(
      selectedKeyValues,
      availableCalibrationKeys,
    );

    if (selectedPerKey.length === 0) {
      showToast('Please select key value(s) first', 'warning');
      return;
    }

    const combinations = generateCartesianProduct(selectedPerKey);

    if (activeOperation.type === 'add') {
      const existingSignatures = new Set(
        configuredCkvs.map((ckv) =>
          ckv.keyValuePairs
            .map((pair) => `${pair.key.id}:${pair.value.id}`)
            .sort()
            .join('|'),
        ),
      );

      const newEntries: ConfiguredCkv[] = [];
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
            resolveGraphKeyAndValue(
              availableCalibrationKeys,
              pair.key.id,
              pair.value.id,
            ),
          )
          .filter(
            (pair): pair is {key: CalibrationKey; value: KeyValue} =>
              pair !== null,
          );

        if (resolvedPairs.length === 0) {
          return;
        }

        newEntries.push({
          keyValuePairs: resolvedPairs,
          pidConfig: chosenPids,
          systemId: buildCkvSystemId(resolvedPairs),
        });
      });

      if (newEntries.length > 0) {
        updateConfiguredCkvs(instanceSystemId, [
          ...configuredCkvs,
          ...newEntries,
        ]);
      }
    } else {
      const editIndex = activeOperation.index;
      const originalCkv = configuredCkvs[editIndex];
      const otherCkvs = configuredCkvs.filter((_, i) => i !== editIndex);

      const existingSignatures = new Set(
        otherCkvs.map((ckv) =>
          ckv.keyValuePairs
            .map((pair) => `${pair.key.id}:${pair.value.id}`)
            .sort()
            .join('|'),
        ),
      );

      const editedEntries: ConfiguredCkv[] = [];
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
            resolveGraphKeyAndValue(
              availableCalibrationKeys,
              pair.key.id,
              pair.value.id,
            ),
          )
          .filter(
            (pair): pair is {key: CalibrationKey; value: KeyValue} =>
              pair !== null,
          );

        if (resolvedPairs.length === 0) {
          return;
        }

        editedEntries.push({
          keyValuePairs: resolvedPairs,
          pidConfig: chosenPids,
          systemId:
            editedEntries.length === 0
              ? originalCkv.systemId
              : buildCkvSystemId(resolvedPairs),
        });
      });

      const replacementEntries =
        editedEntries.length > 0
          ? editedEntries
          : [{...originalCkv, pidConfig: chosenPids}];

      updateConfiguredCkvs(instanceSystemId, [
        ...configuredCkvs.slice(0, editIndex),
        ...replacementEntries,
        ...configuredCkvs.slice(editIndex + 1),
      ]);
    }

    setActiveOperation(null);
    resetPickerState();
  }, [
    activeOperation,
    parameters,
    configuredCkvs,
    selectedKeyValues,
    availableCalibrationKeys,
    updateConfiguredCkvs,
    instanceSystemId,
    resetPickerState,
  ]);

  const sortedValuesForKey = useCallback(
    (key: CalibrationKey) => {
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
        label: formatCkvEntry(ckv.keyValuePairs, ckvDisplayMode),
      })),
    [configuredCkvs, ckvDisplayMode],
  );

  const showPicker = activeOperation !== null;
  const highlightedEntryIndex =
    activeOperation?.type === 'edit' ? activeOperation.index : undefined;
  const onAddClick = isEditable ? handleAddClick : undefined;
  const onEditItem = isEditable ? handleEditCKV : undefined;
  const onDeleteItem = isEditable ? handleDeleteCKV : undefined;
  const onCopyEntry = useCallback(
    (entryIndex: number) => {
      void copyCkvEntry(
        formatCkvEntry(
          configuredCkvs[entryIndex].keyValuePairs,
          ckvDisplayMode,
        ),
      );
    },
    [configuredCkvs, ckvDisplayMode],
  );

  const configSummary = (
    <ConfigSummaryView
      highlightedEntryIndex={highlightedEntryIndex}
      isActionsDisabled={showPicker}
      isEditable={isEditable}
      items={configuredItems}
      onAddClick={onAddClick}
      onCopyEntry={onCopyEntry}
      onDeleteItem={onDeleteItem}
      onEditItem={onEditItem}
      showEditIcon
      title="Configured CKVs"
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {!showPicker && configSummary}

      {showPicker && (
        <>
          <CkvParametersSection
            isEditable={isEditable}
            onParametersChange={setParameters}
            parameters={parameters}
            visible={showPicker}
          />

          <KvVectorEditor
            ariaLabel="Search calibration keys or values"
            clearable
            onSuggestionCommit={handleSuggestionCommit}
            onTextChange={handlePickerBoxChange}
            placeholder="Search calibration keys or values..."
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

          {diagnostics.length > 0 && (
            <div className="text-support-danger text-sm" role="alert">
              {diagnostics.map((diagnostic, index) =>
                renderDiagnostic(diagnostic, index),
              )}
            </div>
          )}

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
                  <p>No calibration keys or values match your search</p>
                </div>
              ) : (
                filteredKeyNames.map((keyName) => {
                  const key = availableCalibrationKeys[keyName];
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
              emphasis="primary"
              onClick={handleApply}
              size="sm"
              variant="fill"
            >
              Apply
            </Button>
          </div>
        </>
      )}

      {showPicker && configSummary}
    </div>
  );
}
