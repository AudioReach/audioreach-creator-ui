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
import {showToast} from '~shared/controls/global-toaster';
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
  buildCkvSystemId,
  generateCartesianProduct,
  getActiveSearchToken,
  groupSelectedValuesByKey,
  matchesSearchTerm,
  partitionKeysBySelection,
  resolveGraphKeyAndValue,
  resolveSelectedPairs,
  sortKeys,
} from '../../../lib/ckv-picker-selection';
import {CkvSearchDiagnostics} from '../../../ui/ckv-search-diagnostics';
import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '../../../ui/kv-vector-editor';
import {formatCkvEntry} from '../../lib/ckv-display-format';
import {
  type CkvSearchDiagnostic,
  type CkvSearchSuggestion,
  getCkvSearchSuggestions,
  resolveCkvSearchInput,
} from '../../lib/ckv-search-resolver';
import {tokenizeKvSearchInput} from '../../lib/tokenize-kv-search-input';

import type {CkvParameter} from './calibration-keys-config.types';
import {transformParamDefinitionsToCKVParameters} from './ckv.mapper';
import {CkvParametersSection} from './ckv-parameters-section';

interface CalibrationKeysConfigPanelProps {
  addCkvs: (
    instanceSystemId: string,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  calibrationKeys: Record<string, CalibrationKey>;
  configuredCkvs: ConfiguredCkv[];
  deleteCkvs: (
    instanceSystemId: string,
    ckvSystemIds: string[],
  ) => Promise<boolean>;
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
  updateCkvParametersOnly: (
    instanceSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  updateConfiguredCkvs: (
    instanceSystemId: string,
    ckvs: ConfiguredCkv[],
  ) => void;
}

type ActiveCkvOperation = {type: 'add'} | {index: number; type: 'edit'} | null;

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

export function CalibrationKeysConfigPanel({
  addCkvs,
  calibrationKeys,
  configuredCkvs,
  deleteCkvs,
  instanceSystemId,
  isEditable,
  moduleId: _moduleId,
  paramDefinitionsSummaryInfo,
  updateCkvParametersOnly,
  updateConfiguredCkvs,
}: CalibrationKeysConfigPanelProps) {
  const baselineParameters = useMemo<CkvParameter[]>(() => {
    const baseline = transformParamDefinitionsToCKVParameters(
      paramDefinitionsSummaryInfo,
    );
    if (configuredCkvs.length === 0) {
      return baseline.map((param) => ({...param, checked: true}));
    }
    return baseline.map((param) => ({
      ...param,
      checked: configuredCkvs[0].pidConfig.includes(param.pid),
    }));
  }, [paramDefinitionsSummaryInfo, configuredCkvs]);

  const paramSystemIdByPid = useMemo(
    () =>
      Object.fromEntries(
        paramDefinitionsSummaryInfo.map((param) => [
          param.naturalId,
          param.systemId,
        ]),
      ) as Record<number, string>,
    [paramDefinitionsSummaryInfo],
  );

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

  const resolvedPickerSelection = useMemo(
    () => resolveSelectedPairs(selectedKeyValues, calibrationKeys),
    [selectedKeyValues, calibrationKeys],
  );

  const confirmedSelectionText = useMemo(
    () =>
      resolvedPickerSelection.length === 0
        ? ''
        : formatCkvEntry(resolvedPickerSelection),
    [resolvedPickerSelection],
  );

  // Selection → box: explicitly reflect the next selection into the search
  // field for every selection-driven change (checkbox toggle or suggestion
  // commit — requirement 30). Kept as a direct call rather than a `useEffect`
  // watching `confirmedSelectionText` so that typing-triggered resolution
  // (handlePickerBoxChange/applySelectionFromTokens below) never overwrites
  // what the user is actively typing, and an empty selection clears the box
  // instead of surfacing formatCkvEntry's empty-array sentinel.
  const applyPickerSelection = useCallback(
    (next: Record<number, Record<number, boolean>>) => {
      setSelectedKeyValues(next);
      const pairs = resolveSelectedPairs(next, calibrationKeys);
      setPickerBoxText(pairs.length === 0 ? '' : formatCkvEntry(pairs));
    },
    [calibrationKeys],
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
    (key: CalibrationKey) => {
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

  // Suggestion commits always select the value, never toggle it off — unlike
  // a checkbox click, a suggestion in the dropdown doesn't reflect current
  // selection state, so treating it as a toggle could silently deselect a
  // value that typing had already resolved in the background the instant a
  // matching suggestion is clicked.
  //
  // Picking a suggestion for value name V also drops any OTHER key's
  // same-named V selection, but only while the box is still "live" (its text
  // hasn't yet been rewritten to the confirmed bracket prefix): an ambiguous
  // bare search (e.g. "Off" matching both Pause and DataLogging) auto-
  // resolves to one key as a guess the instant it's typed, and the
  // suggestion list is how the user corrects that still-unconfirmed guess —
  // clicking a different candidate must replace it, not add a second value
  // alongside it. Once the box has been rewritten into bracket form (a prior
  // term is locked in) and the user is extending it with a new "+"-joined
  // term, an existing same-named selection belongs to that earlier, already-
  // confirmed term and must be left alone — only merge in the new pick.
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
                  calibrationKeys,
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
      calibrationKeys,
      confirmedSelectionText,
      pickerBoxText,
    ],
  );

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

      const tokens = tokenizeKvSearchInput(value);
      const {diagnostics: resolvedDiagnostics, resolved} =
        resolveCkvSearchInput(calibrationKeys, tokens);
      applySelectionFromTokens(resolved);
      setDiagnostics(resolvedDiagnostics);
    },
    [calibrationKeys, applySelectionFromTokens, confirmedSelectionText],
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
      const extension = pickerBoxText
        .slice(confirmedSelectionText.length)
        .trim();
      return getActiveSearchToken(extension);
    }
    return '';
  }, [pickerBoxText, confirmedSelectionText]);

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
    return getActiveSearchToken(pickerBoxText);
  }, [pickerBoxText, confirmedSelectionText, pickerFilterText]);

  const availableSuggestions = useMemo<
    Array<KvVectorEditorSuggestion<CkvSearchSuggestion>>
  >(
    () =>
      pickerSuggestionQueryText
        ? getCkvSearchSuggestions(
            calibrationKeys,
            pickerSuggestionQueryText,
          ).map((suggestion) => ({
            id: `${suggestion.key.id}:${suggestion.value.id}:${suggestion.kind}`,
            primaryText: suggestion.value.name,
            secondaryText: `Key: ${suggestion.key.name}`,
            value: suggestion,
          }))
        : [],
    [calibrationKeys, pickerSuggestionQueryText],
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
        ? Object.keys(calibrationKeys)
        : Object.keys(calibrationKeys).filter((keyName) =>
            matchesSearchTerm(
              keyName,
              calibrationKeys[keyName],
              pickerFilterText,
              searchNumber,
            ),
          );
    const sorted = sortKeys(keys, calibrationKeys, sortColumn, sortOrder);
    return partitionKeysBySelection(sorted, calibrationKeys, selectedKeyValues);
  }, [
    calibrationKeys,
    pickerFilterText,
    sortColumn,
    sortOrder,
    selectedKeyValues,
  ]);

  const handleExpandAll = useCallback(() => {
    setExpandedKeys(filteredKeyNames.map((name) => calibrationKeys[name].id));
  }, [filteredKeyNames, calibrationKeys]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  const handleAddClick = useCallback(() => {
    setActiveOperation({type: 'add'});
    resetPickerState();
    setParameters(baselineParameters);
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
      applyPickerSelection(nextSelections);
      setExpandedKeys(ckv.keyValuePairs.map((pair) => pair.key.id));
      setDiagnostics([]);
      setParameters(
        baselineParameters.map((param) => ({
          ...param,
          checked: ckv.pidConfig.includes(param.pid),
        })),
      );
    },
    [configuredCkvs, baselineParameters, applyPickerSelection],
  );

  const handleDeleteCKV = useCallback(
    async (index: number) => {
      const systemId = configuredCkvs[index]?.systemId;
      if (!systemId) {
        return;
      }
      await deleteCkvs(instanceSystemId, [systemId]);
    },
    [configuredCkvs, deleteCkvs, instanceSystemId],
  );

  const handleCancel = useCallback(() => {
    setActiveOperation(null);
    resetPickerState();
    setParameters(baselineParameters);
  }, [resetPickerState, baselineParameters]);

  const hasPendingChange = useMemo(() => {
    const checkedPidSet = new Set(
      parameters.filter((p) => p.checked).map((p) => p.pid),
    );
    const baselinePidSet = new Set(
      baselineParameters.filter((p) => p.checked).map((p) => p.pid),
    );
    const parametersChanged =
      checkedPidSet.size !== baselinePidSet.size ||
      [...checkedPidSet].some((pid) => !baselinePidSet.has(pid));
    return (
      parametersChanged ||
      (activeOperation?.type === 'add' && resolvedPickerSelection.length > 0)
    );
  }, [
    parameters,
    baselineParameters,
    activeOperation,
    resolvedPickerSelection,
  ]);

  const handleApply = useCallback(async () => {
    const chosenPids = parameters.filter((p) => p.checked).map((p) => p.pid);

    if (activeOperation !== null && chosenPids.length === 0) {
      showToast('Please select at least one PID', 'warning');
      return;
    }

    if (activeOperation === null) {
      const parameterSystemIds = chosenPids
        .map((pid) => paramSystemIdByPid[pid])
        .filter((systemId): systemId is string => Boolean(systemId));
      const success = await updateCkvParametersOnly(
        instanceSystemId,
        parameterSystemIds,
      );
      if (success) {
        setActiveOperation(null);
        resetPickerState();
      }
      return;
    }

    const selectedPerKey = groupSelectedValuesByKey(
      selectedKeyValues,
      calibrationKeys,
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
            resolveGraphKeyAndValue(
              calibrationKeys,
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

        valueSystemIdCombinations.push(
          resolvedPairs.map((pair) => pair.value.systemId),
        );
      });

      if (valueSystemIdCombinations.length === 0) {
        setActiveOperation(null);
        resetPickerState();
        return;
      }

      // CKV parameters are module-scoped — always push the chosen PIDs
      // ahead of the CKV write so every CKV on the module (new and
      // pre-existing) ends up with the same supportedParameters.
      const parameterSystemIds = chosenPids
        .map((pid) => paramSystemIdByPid[pid])
        .filter((systemId): systemId is string => Boolean(systemId));

      const success = await addCkvs(
        instanceSystemId,
        valueSystemIdCombinations,
        parameterSystemIds,
      );
      if (success) {
        setActiveOperation(null);
        resetPickerState();
      }
      return;
    }

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
          resolveGraphKeyAndValue(calibrationKeys, pair.key.id, pair.value.id),
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

    setActiveOperation(null);
    resetPickerState();
  }, [
    activeOperation,
    parameters,
    paramSystemIdByPid,
    configuredCkvs,
    selectedKeyValues,
    calibrationKeys,
    addCkvs,
    updateCkvParametersOnly,
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
        label: formatCkvEntry(ckv.keyValuePairs),
      })),
    [configuredCkvs],
  );

  const showPicker = activeOperation !== null;
  const highlightedEntryIndex =
    activeOperation?.type === 'edit' ? activeOperation.index : undefined;
  const onAddClick = isEditable ? handleAddClick : undefined;
  const onEditItem = isEditable ? handleEditCKV : undefined;
  const onDeleteItem = isEditable
    ? (index: number) => {
        void handleDeleteCKV(index);
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

  const handleDeleteFiltered = useCallback(
    async (ids: number[]) => {
      const ckvSystemIds = ids
        .map((id) => configuredCkvs[id]?.systemId)
        .filter((systemId): systemId is string => Boolean(systemId));
      if (ckvSystemIds.length === 0) {
        return;
      }
      await deleteCkvs(instanceSystemId, ckvSystemIds);
    },
    [configuredCkvs, deleteCkvs, instanceSystemId],
  );

  const onDeleteFiltered = isEditable
    ? (ids: number[]) => {
        void handleDeleteFiltered(ids);
      }
    : undefined;

  const applyButtonLabel = activeOperation?.type === 'add' ? 'Add' : 'Update';

  const configSummary = (
    <ConfigSummaryView
      highlightedEntryIndex={highlightedEntryIndex}
      isActionsDisabled={showPicker}
      isEditable={isEditable}
      items={configuredItems}
      onAddClick={onAddClick}
      onCopyEntry={onCopyEntry}
      onDeleteFiltered={onDeleteFiltered}
      onDeleteItem={onDeleteItem}
      onEditItem={onEditItem}
      // Edit icon hidden until backend CKV DTOs support edit-in-place;
      // showEditIcon omitted (defaults false) so re-enabling is one line.
      title="Configured CKVs"
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {!showPicker && configSummary}

      <CkvParametersSection
        isEditable={isEditable}
        onParametersChange={setParameters}
        parameters={parameters}
      />

      {showPicker && (
        <>
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
                  <p>No calibration keys or values match your search</p>
                </div>
              ) : (
                filteredKeyNames.map((keyName) => {
                  const key = calibrationKeys[keyName];
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

      <div className="flex justify-end gap-2">
        {(showPicker || hasPendingChange) && (
          <Button
            emphasis="neutral"
            onClick={handleCancel}
            size="sm"
            variant="fill"
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={!hasPendingChange}
          emphasis="primary"
          onClick={() => {
            void handleApply();
          }}
          size="sm"
          variant="fill"
        >
          {applyButtonLabel}
        </Button>
      </div>

      {showPicker && configSummary}
    </div>
  );
}
