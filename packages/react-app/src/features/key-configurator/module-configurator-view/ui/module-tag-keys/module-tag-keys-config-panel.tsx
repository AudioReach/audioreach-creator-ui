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
  Plus,
  Trash2,
} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';

import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import ArcSearchBar from '~shared/controls/arc-search-bar';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {
  Key,
  KeyValue,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '../../../ui/kv-vector-editor';
import {
  formatConfiguredTkvLabel,
  formatTkvKeyValuePair,
} from '../../lib/tkv-display-format';
import {
  getTkvSearchSuggestions,
  resolveTagGroupIdForKey,
  resolveTkvSearchInput,
  type TkvSearchDiagnostic,
  type TkvSearchSuggestion,
} from '../../lib/tkv-search-resolver';

import type {
  ConfiguredTkv,
  TagGroup,
  TkvParameter,
} from './module-tag-keys-config.types';
import {TagGroupSummary} from './tag-group-summary';
import {transformParamDefinitionsToTKVParameters} from './tag-info.mapper';
import {TkvParametersSection} from './tkv-parameters-section';

interface ModuleTagKeysConfigPanelProps {
  addTkvs: (
    instanceSystemId: string,
    tagGroupId: number,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  configuredTkvs: ConfiguredTkv[];
  deleteTagGroup: (
    instanceSystemId: string,
    tagGroupId: number,
  ) => Promise<boolean>;
  deleteTkvs: (
    instanceSystemId: string,
    targets: Array<{tagGroupId: number; tkvSystemId: string}>,
  ) => Promise<boolean>;
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
  moduleTagKeys: Record<string, TagGroup>;
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
  updateTkvParameters: (
    instanceSystemId: string,
    tkvSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
}

type ActiveTkvOperation =
  {type: 'idle'} | {type: 'adding'} | {index: number; type: 'editing'};

function sortTagGroupNames(
  names: string[],
  moduleTagKeys: Record<string, TagGroup>,
  sortColumn: SortColumn,
  sortOrder: SortOrder,
): string[] {
  if (!sortColumn) {
    return names;
  }
  return [...names].sort((a, b) => {
    const comparison =
      sortColumn === 'id'
        ? moduleTagKeys[a].id - moduleTagKeys[b].id
        : a.toLowerCase().localeCompare(b.toLowerCase());
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

function buildTkvId(
  tagGroupId: number,
  keyValuePairs: Array<{key: {id: number}; value: {id: number}}>,
): string {
  return `${tagGroupId}_${keyValuePairs
    .map((pair) => `${pair.key.id}_${pair.value.id}`)
    .sort()
    .join('_')}`;
}

function buildTkvSignature(
  tagGroupId: number,
  keyValuePairs: Array<{key: {id: number}; value: {id: number}}>,
): string {
  return `${tagGroupId}|${keyValuePairs
    .map((pair) => `${pair.key.id}:${pair.value.id}`)
    .sort()
    .join('|')}`;
}

async function copyTkvEntry(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    logger.error('Module tag key entry copy failed', {
      action: 'copy_tkv_entry',
      component: 'ModuleTagKeysConfigPanel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function groupSelectedValuesByKey(
  selectedValues: Record<number, Record<number, boolean>>,
  tagGroup: TagGroup,
): Array<{key: Key; values: KeyValue[]}> {
  const selectedPerKey: Array<{key: Key; values: KeyValue[]}> = [];
  Object.values(tagGroup.keys).forEach((modKey) => {
    const values = modKey.values.filter(
      (v) => selectedValues[modKey.id]?.[v.id],
    );
    if (values.length > 0) {
      selectedPerKey.push({
        key: {id: modKey.id, name: modKey.name, systemId: modKey.systemId},
        values,
      });
    }
  });
  return selectedPerKey;
}

function findKeyValueName(
  moduleTagKeys: Record<string, TagGroup>,
  keyId: number,
  valueId: number,
): string | undefined {
  for (const tagGroup of Object.values(moduleTagKeys)) {
    for (const modKey of Object.values(tagGroup.keys)) {
      if (modKey.id !== keyId) {
        continue;
      }
      const value = modKey.values.find((v) => v.id === valueId);
      if (value) {
        return value.name;
      }
    }
  }
  return undefined;
}

/**
 * Isolates the token currently being typed, scanning for the last `' '`/`'+'`
 * separator outside of a `[Key: Value]` bracket group so an internal bracket
 * space never gets mistaken for a token boundary.
 */
function getActiveTkvSearchToken(text: string): string {
  let bracketDepth = 0;
  let lastSeparatorIndex = -1;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '[') {
      bracketDepth += 1;
    } else if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (bracketDepth === 0 && (char === ' ' || char === '+')) {
      lastSeparatorIndex = index;
    }
  }
  return lastSeparatorIndex < 0
    ? text.trim()
    : text.slice(lastSeparatorIndex + 1).trim();
}

function generateCartesianProduct(
  selectedPerKey: Array<{key: Key; values: KeyValue[]}>,
): Array<Array<{key: Key; value: KeyValue}>> {
  const combinations: Array<Array<{key: Key; value: KeyValue}>> = [];

  function generate(
    index: number,
    currentCombo: Array<{key: Key; value: KeyValue}>,
  ) {
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
  }

  generate(0, []);
  return combinations;
}

export function ModuleTagKeysConfigPanel({
  addTkvs,
  configuredTkvs,
  deleteTagGroup,
  deleteTkvs,
  instanceSystemId,
  isEditable,
  moduleId: _moduleId,
  moduleTagKeys,
  paramDefinitionsSummaryInfo,
  updateTkvParameters,
}: ModuleTagKeysConfigPanelProps) {
  const baselineParameters = useMemo<TkvParameter[]>(
    () => transformParamDefinitionsToTKVParameters(paramDefinitionsSummaryInfo),
    [paramDefinitionsSummaryInfo],
  );

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
    useState<TkvParameter[]>(baselineParameters);
  const [activeOperation, setActiveOperation] = useState<ActiveTkvOperation>({
    type: 'idle',
  });
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  const [availableSearchTerm, setAvailableSearchTerm] = useState('');
  const [searchDiagnostic, setSearchDiagnostic] =
    useState<TkvSearchDiagnostic | null>(null);
  const [selectedValues, setSelectedValues] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [selectedTagGroup, setSelectedTagGroup] = useState<number | null>(null);
  // Separate from selectedTagGroup, which is updated eagerly (even for a
  // merely-guessed ambiguous resolution) for checkbox display and the Add
  // button's validation. This only updates on a genuine (non-ambiguous)
  // resolution or an explicit user commit, so the suggestion dropdown keeps
  // offering every ambiguous candidate — like CKV — instead of narrowing to
  // whichever tag group the auto-resolve happened to guess.
  const [suggestionScopeTagGroupId, setSuggestionScopeTagGroupId] = useState<
    number | null
  >(null);
  const [expandedTagGroups, setExpandedTagGroups] = useState<number[]>([]);
  const [expandedModKeys, setExpandedModKeys] = useState<
    Record<number, boolean>
  >({});
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isConfigSectionCollapsed, setIsConfigSectionCollapsed] =
    useState(false);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const resetPickerState = useCallback(() => {
    setSelectedValues({});
    setSelectedTagGroup(null);
    setSuggestionScopeTagGroupId(null);
    setExpandedTagGroups([]);
    setExpandedModKeys({});
    setAvailableSearchTerm('');
    setSearchDiagnostic(null);
  }, []);

  useEffect(() => {
    setActiveOperation({type: 'idle'});
    resetPickerState();
    // Resetting the active picker on instance switch (not on every baseline
    // recompute) mirrors CalibrationKeysConfigPanel's own instance-switch effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceSystemId]);

  // The available-tags table always shows every tag group — only the
  // autosuggest dropdown narrows as the user types (matching CKV).
  const filteredAndSortedTagGroups = useMemo(
    () =>
      sortTagGroupNames(
        Object.keys(moduleTagKeys),
        moduleTagKeys,
        sortColumn,
        sortOrder,
      ),
    [moduleTagKeys, sortColumn, sortOrder],
  );

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
        <ArrowUp className="text-brand-primary h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="text-brand-primary h-3.5 w-3.5" />
      );
    },
    [sortColumn, sortOrder],
  );

  const toggleTagGroupExpansion = useCallback((tagGroupId: number) => {
    setExpandedTagGroups((prev) =>
      prev.includes(tagGroupId)
        ? prev.filter((t) => t !== tagGroupId)
        : [...prev, tagGroupId],
    );
  }, []);

  const toggleModKeyExpansion = useCallback((modKeyId: number) => {
    setExpandedModKeys((prev) => ({
      ...prev,
      [modKeyId]: !prev[modKeyId],
    }));
  }, []);

  const selectedTagGroupData = useMemo(() => {
    if (selectedTagGroup === null) {
      return null;
    }
    const tagGroupName = Object.keys(moduleTagKeys).find(
      (name) => moduleTagKeys[name].id === selectedTagGroup,
    );
    return tagGroupName ? moduleTagKeys[tagGroupName] : null;
  }, [selectedTagGroup, moduleTagKeys]);

  const resolvedPickerSelection = useMemo(() => {
    if (!selectedTagGroupData) {
      return [];
    }
    return groupSelectedValuesByKey(
      selectedValues,
      selectedTagGroupData,
    ).flatMap(({key, values}) => values.map((value) => ({key, value})));
  }, [selectedValues, selectedTagGroupData]);

  const confirmedSelectionText = useMemo(
    () =>
      resolvedPickerSelection.length === 0
        ? ''
        : resolvedPickerSelection
            .map((pair) => formatTkvKeyValuePair(pair))
            .join(' '),
    [resolvedPickerSelection],
  );

  // Selection → box: every selection-driven change (checkbox toggle or
  // suggestion commit) recomputes the box text fresh from the full
  // resulting selection, mirroring CalibrationKeysConfigPanel's
  // applyPickerSelection — never append/overwrite with just the newly
  // changed value's own name, which would discard everything else already
  // in the box.
  const applyPickerSelection = useCallback(
    (
      next: Record<number, Record<number, boolean>>,
      tagGroupId: number | null,
    ) => {
      setSelectedValues(next);
      setSelectedTagGroup(tagGroupId);
      setSuggestionScopeTagGroupId(tagGroupId);

      const tagGroupName =
        tagGroupId === null
          ? undefined
          : Object.keys(moduleTagKeys).find(
              (name) => moduleTagKeys[name].id === tagGroupId,
            );
      const pairs = tagGroupName
        ? groupSelectedValuesByKey(next, moduleTagKeys[tagGroupName]).flatMap(
            ({key, values}) => values.map((value) => ({key, value})),
          )
        : [];
      setAvailableSearchTerm(
        pairs.length === 0
          ? ''
          : pairs.map((pair) => formatTkvKeyValuePair(pair)).join(' '),
      );
    },
    [moduleTagKeys],
  );

  const toggleValueSelection = useCallback(
    (modKeyId: number, valueId: number, tagGroupId: number) => {
      if (selectedTagGroup !== null && selectedTagGroup !== tagGroupId) {
        applyPickerSelection({[modKeyId]: {[valueId]: true}}, tagGroupId);
        return;
      }

      const wasSelected = Boolean(selectedValues[modKeyId]?.[valueId]);
      const nextSelectedValues = {
        ...selectedValues,
        [modKeyId]: {
          ...selectedValues[modKeyId],
          [valueId]: !wasSelected,
        },
      };

      if (!wasSelected) {
        applyPickerSelection(nextSelectedValues, tagGroupId);
        return;
      }

      const tagGroupName = Object.keys(moduleTagKeys).find(
        (name) => moduleTagKeys[name].id === tagGroupId,
      );
      const stillHasSelection = tagGroupName
        ? Object.values(moduleTagKeys[tagGroupName].keys).some((modKey) =>
            modKey.values.some((v) => nextSelectedValues[modKey.id]?.[v.id]),
          )
        : false;
      applyPickerSelection(
        nextSelectedValues,
        stillHasSelection ? tagGroupId : null,
      );
    },
    [selectedTagGroup, selectedValues, moduleTagKeys, applyPickerSelection],
  );

  const toggleModKeySelection = useCallback(
    (tagGroupId: number, modKeyId: number) => {
      const tagGroupName = Object.keys(moduleTagKeys).find(
        (name) => moduleTagKeys[name].id === tagGroupId,
      );
      if (!tagGroupName) {
        return;
      }
      const modKeyName = Object.keys(moduleTagKeys[tagGroupName].keys).find(
        (name) => moduleTagKeys[tagGroupName].keys[name].id === modKeyId,
      );
      if (!modKeyName) {
        return;
      }
      const modKey = moduleTagKeys[tagGroupName].keys[modKeyName];

      if (selectedTagGroup !== null && selectedTagGroup !== tagGroupId) {
        const nextKeySelections: Record<number, boolean> = {};
        modKey.values.forEach((v) => {
          nextKeySelections[v.id] = true;
        });
        applyPickerSelection({[modKeyId]: nextKeySelections}, tagGroupId);
        return;
      }

      const allSelected = modKey.values.every(
        (v) => selectedValues[modKeyId]?.[v.id],
      );
      const nextKeySelections: Record<number, boolean> = {
        ...selectedValues[modKeyId],
      };
      modKey.values.forEach((v) => {
        nextKeySelections[v.id] = !allSelected;
      });
      const nextSelectedValues = {
        ...selectedValues,
        [modKeyId]: nextKeySelections,
      };

      if (!allSelected) {
        applyPickerSelection(nextSelectedValues, tagGroupId);
        return;
      }

      const hasAnySelected = Object.entries(
        moduleTagKeys[tagGroupName].keys,
      ).some(([keyName, key]) => {
        if (keyName === modKeyName) {
          return false;
        }
        return key.values.some((v) => nextSelectedValues[key.id]?.[v.id]);
      });
      applyPickerSelection(
        nextSelectedValues,
        hasAnySelected ? tagGroupId : null,
      );
    },
    [selectedTagGroup, selectedValues, moduleTagKeys, applyPickerSelection],
  );

  // Suggestion commits always select the value, never toggle it off, and —
  // while the box still only holds a live, unconfirmed guess — picking a
  // candidate for an ambiguous value name also drops any OTHER key's
  // same-named selection (correcting the auto-resolved guess). Once the box
  // has been rewritten into the confirmed bracket form and the user is
  // extending it with a new "+"-joined term, the earlier term is left alone
  // and only the new value is merged in.
  const selectValue = useCallback(
    (
      keyId: number,
      valueId: number,
      valueName: string,
      tagGroupId: number,
    ) => {
      const isAppendingConfirmedTerm =
        Boolean(confirmedSelectionText) &&
        availableSearchTerm.startsWith(confirmedSelectionText);

      if (isAppendingConfirmedTerm) {
        const keySelections = selectedValues[keyId] || {};
        applyPickerSelection(
          {...selectedValues, [keyId]: {...keySelections, [valueId]: true}},
          tagGroupId,
        );
        return;
      }

      const next: Record<number, Record<number, boolean>> = {};
      Object.entries(selectedValues).forEach(([keyIdStr, valueSelections]) => {
        const existingKeyId = parseInt(keyIdStr, 10);
        if (existingKeyId === keyId) {
          next[existingKeyId] = {...valueSelections};
          return;
        }
        const retainedSelections = Object.fromEntries(
          Object.entries(valueSelections).filter(([valueIdStr, isSelected]) => {
            if (!isSelected) {
              return true;
            }
            const existingValueName = findKeyValueName(
              moduleTagKeys,
              existingKeyId,
              parseInt(valueIdStr, 10),
            );
            return existingValueName?.toLowerCase() !== valueName.toLowerCase();
          }),
        );
        if (Object.keys(retainedSelections).length > 0) {
          next[existingKeyId] = retainedSelections;
        }
      });
      next[keyId] = {...(next[keyId] ?? {}), [valueId]: true};
      applyPickerSelection(next, tagGroupId);
    },
    [
      selectedValues,
      applyPickerSelection,
      moduleTagKeys,
      confirmedSelectionText,
      availableSearchTerm,
    ],
  );

  const handleExpandAll = useCallback(() => {
    setExpandedTagGroups(
      filteredAndSortedTagGroups.map((name) => moduleTagKeys[name].id),
    );
    const allModKeys: Record<number, boolean> = {};
    filteredAndSortedTagGroups.forEach((name) => {
      Object.values(moduleTagKeys[name].keys).forEach((modKey) => {
        allModKeys[modKey.id] = true;
      });
    });
    setExpandedModKeys(allModKeys);
  }, [filteredAndSortedTagGroups, moduleTagKeys]);

  const handleCollapseAll = useCallback(() => {
    setExpandedTagGroups([]);
    setExpandedModKeys({});
  }, []);

  // Suggestions rank against the token currently being typed: the active
  // separator-delimited segment of the extension past a confirmed prefix, or
  // of the full box text when nothing is confirmed yet or the text was fully
  // replaced — so a resolved first token (e.g. "[Pause: Off]+") doesn't
  // swallow the still-being-typed second token into one unmatchable query
  // string (parity with CKV's pickerSuggestionQueryText).
  const tkvSuggestionQueryText = useMemo(() => {
    if (
      confirmedSelectionText &&
      availableSearchTerm.startsWith(confirmedSelectionText)
    ) {
      const extension = availableSearchTerm
        .slice(confirmedSelectionText.length)
        .trim();
      return getActiveTkvSearchToken(extension);
    }
    return getActiveTkvSearchToken(availableSearchTerm);
  }, [availableSearchTerm, confirmedSelectionText]);

  const availableSuggestions = useMemo<
    Array<KvVectorEditorSuggestion<TkvSearchSuggestion>>
  >(() => {
    if (!tkvSuggestionQueryText) {
      return [];
    }
    return getTkvSearchSuggestions(
      tkvSuggestionQueryText,
      moduleTagKeys,
      suggestionScopeTagGroupId,
    ).map((suggestion) => ({
      id: `${suggestion.key.id}:${suggestion.value.id}`,
      primaryText: suggestion.value.name,
      secondaryText: `Key: ${suggestion.key.name}`,
      value: suggestion,
    }));
  }, [tkvSuggestionQueryText, moduleTagKeys, suggestionScopeTagGroupId]);

  const handleSuggestionCommit = useCallback(
    (suggestion: TkvSearchSuggestion) => {
      const tagGroupId = resolveTagGroupIdForKey(
        moduleTagKeys,
        suggestion.key.id,
      );
      if (tagGroupId === null) {
        return;
      }
      selectValue(
        suggestion.key.id,
        suggestion.value.id,
        suggestion.value.name,
        tagGroupId,
      );
    },
    [moduleTagKeys, selectValue],
  );

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setAvailableSearchTerm(text);

      // Typing right after a confirmed selection (e.g. appending "+On" to
      // "[Pause: Off]") is a live filter over the already-locked tag group,
      // not a replacement — resolving it here would wipe out the confirmed
      // term before a suggestion is even picked. selectValue is what
      // actually commits the new term once the user picks a suggestion.
      const isExtension =
        Boolean(confirmedSelectionText) &&
        text.startsWith(confirmedSelectionText);
      if (isExtension) {
        setSearchDiagnostic(null);
        return;
      }

      const resolved = resolveTkvSearchInput(text, moduleTagKeys, null);

      // Rebuild selectedValues from scratch on every keystroke rather than
      // merging into the previous selection — the resolver already
      // re-resolves the full current text each time, so merging would leave
      // stale selections behind a backspace instead of dropping them.
      if (resolved.kind === 'empty' || resolved.kind === 'query') {
        setSelectedValues({});
        setSelectedTagGroup(null);
        setSuggestionScopeTagGroupId(null);
        setSearchDiagnostic(null);
        return;
      }

      const nextSelectedValues: Record<number, Record<number, boolean>> = {};
      resolved.pairs.forEach((pair) => {
        nextSelectedValues[pair.key.id] = {
          ...nextSelectedValues[pair.key.id],
          [pair.value.id]: true,
        };
      });
      setSelectedValues(nextSelectedValues);
      setSelectedTagGroup(resolved.tagGroupId);
      // An ambiguous resolution is only a guess, not a confirmed choice —
      // keep the suggestion scope unlocked so the dropdown still offers
      // every candidate the user may have meant, matching CKV. A genuine
      // (unambiguous) resolution narrows future suggestions as usual.
      if (resolved.kind !== 'ambiguous') {
        setSuggestionScopeTagGroupId(resolved.tagGroupId);
      }
      setSearchDiagnostic(
        resolved.kind === 'ambiguous' ? resolved.diagnostic : null,
      );
    },
    [moduleTagKeys, confirmedSelectionText],
  );

  const handleAddClick = useCallback(() => {
    setActiveOperation({type: 'adding'});
    resetPickerState();
    setParameters(baselineParameters);

    setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, [resetPickerState, baselineParameters]);

  const handleEditItem = useCallback(
    (id: string) => {
      const index = configuredTkvs.findIndex(
        (tkv) => buildTkvId(tkv.tagGroupId, tkv.keyValuePairs) === id,
      );
      if (index === -1) {
        return;
      }
      const tkv = configuredTkvs[index];

      setActiveOperation({index, type: 'editing'});
      resetPickerState();
      setParameters(
        baselineParameters.map((param) => ({
          ...param,
          checked: tkv.pidConfig.includes(param.pid),
        })),
      );

      setTimeout(() => {
        scrollAnchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [configuredTkvs, baselineParameters, resetPickerState],
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const tkv = configuredTkvs.find(
        (candidate) => buildTkvId(candidate.tagGroupId, candidate.keyValuePairs) === id,
      );
      if (!tkv) {
        return;
      }
      // A module tag (no key-value pairs) has no TKV to delete — removing
      // it means removing the tag itself.
      const success =
        tkv.keyValuePairs.length === 0
          ? await deleteTagGroup(instanceSystemId, tkv.tagGroupId)
          : await deleteTkvs(instanceSystemId, [
              {tagGroupId: tkv.tagGroupId, tkvSystemId: tkv.systemId},
            ]);
      if (!success) {
        return;
      }

      if (
        activeOperation.type === 'editing' &&
        configuredTkvs[activeOperation.index] === tkv
      ) {
        setActiveOperation({type: 'idle'});
        resetPickerState();
        setParameters(baselineParameters);
      }
    },
    [
      configuredTkvs,
      deleteTkvs,
      deleteTagGroup,
      instanceSystemId,
      activeOperation,
      resetPickerState,
      baselineParameters,
    ],
  );

  const handleDeleteTagGroup = useCallback(
    async (tagGroupName: string) => {
      const tagGroupId = configuredTkvs.find(
        (tkv) => tkv.tagGroup === tagGroupName,
      )?.tagGroupId;
      if (tagGroupId === undefined) {
        return;
      }
      const success = await deleteTagGroup(instanceSystemId, tagGroupId);
      if (!success) {
        return;
      }

      if (
        activeOperation.type === 'editing' &&
        configuredTkvs[activeOperation.index]?.tagGroup === tagGroupName
      ) {
        setActiveOperation({type: 'idle'});
        resetPickerState();
        setParameters(baselineParameters);
      }
    },
    [
      configuredTkvs,
      activeOperation,
      deleteTagGroup,
      instanceSystemId,
      resetPickerState,
      baselineParameters,
    ],
  );

  const handleCancel = useCallback(() => {
    setActiveOperation({type: 'idle'});
    resetPickerState();
    setParameters(baselineParameters);
  }, [resetPickerState, baselineParameters]);

  const handleApply = useCallback(async () => {
    if (activeOperation.type === 'editing') {
      const originalTkv = configuredTkvs[activeOperation.index];
      if (!originalTkv) {
        return;
      }
      const parameterSystemIds = parameters
        .filter((p) => p.checked)
        .map((p) => paramSystemIdByPid[p.pid])
        .filter((systemId): systemId is string => Boolean(systemId));
      const success = await updateTkvParameters(
        instanceSystemId,
        originalTkv.systemId,
        parameterSystemIds,
      );
      if (!success) {
        return;
      }
    } else {
      if (selectedTagGroup === null) {
        showToast('Please select a tag group', 'warning');
        return;
      }
      const tagGroupName = Object.keys(moduleTagKeys).find(
        (name) => moduleTagKeys[name].id === selectedTagGroup,
      );
      if (!tagGroupName) {
        return;
      }
      const tagGroup = moduleTagKeys[tagGroupName];
      const selectedPerKey = groupSelectedValuesByKey(selectedValues, tagGroup);

      if (selectedPerKey.length === 0) {
        const success = await addTkvs(instanceSystemId, tagGroup.id, [], []);
        if (!success) {
          return;
        }
      } else {
        const checkedPids = parameters
          .filter((p) => p.checked)
          .map((p) => p.pid);
        if (checkedPids.length === 0) {
          showToast('Please select at least one PID', 'warning');
          return;
        }
        const parameterSystemIds = checkedPids
          .map((pid) => paramSystemIdByPid[pid])
          .filter((systemId): systemId is string => Boolean(systemId));

        const combinations = generateCartesianProduct(selectedPerKey);
        const existingSignatures = new Set(
          configuredTkvs.map((tkv) =>
            buildTkvSignature(tkv.tagGroupId, tkv.keyValuePairs),
          ),
        );
        const uniqueCombinations = combinations.filter((keyValuePairs) => {
          const signature = buildTkvSignature(tagGroup.id, keyValuePairs);
          if (existingSignatures.has(signature)) {
            return false;
          }
          existingSignatures.add(signature);
          return true;
        });
        if (uniqueCombinations.length === 0) {
          showToast('This tag key combination is already configured', 'warning');
          return;
        }

        const success = await addTkvs(
          instanceSystemId,
          tagGroup.id,
          uniqueCombinations.map((pairs) =>
            pairs.map((pair) => pair.value.systemId),
          ),
          parameterSystemIds,
        );
        if (!success) {
          return;
        }
      }
    }

    setActiveOperation({type: 'idle'});
    resetPickerState();
    setParameters(baselineParameters);

    setTimeout(() => {
      configSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, [
    activeOperation,
    configuredTkvs,
    parameters,
    paramSystemIdByPid,
    updateTkvParameters,
    instanceSystemId,
    selectedTagGroup,
    moduleTagKeys,
    selectedValues,
    addTkvs,
    resetPickerState,
    baselineParameters,
  ]);

  const hasPendingParameterChange = useMemo(() => {
    if (activeOperation.type !== 'editing') {
      return true;
    }
    const originalTkv = configuredTkvs[activeOperation.index];
    if (!originalTkv) {
      return false;
    }
    const checkedPidSet = new Set(
      parameters.filter((p) => p.checked).map((p) => p.pid),
    );
    const originalPidSet = new Set(originalTkv.pidConfig);
    return (
      checkedPidSet.size !== originalPidSet.size ||
      [...checkedPidSet].some((pid) => !originalPidSet.has(pid))
    );
  }, [activeOperation, configuredTkvs, parameters]);

  const groupedTkvs = useMemo(() => {
    const groups: Record<string, ConfiguredTkv[]> = {};
    configuredTkvs.forEach((tkv) => {
      (groups[tkv.tagGroup] ??= []).push(tkv);
    });
    return groups;
  }, [configuredTkvs]);

  const filteredGroupedTkvs = useMemo(() => {
    if (!configSearchTerm) {
      return groupedTkvs;
    }
    const filtered: Record<string, ConfiguredTkv[]> = {};
    Object.keys(groupedTkvs).forEach((tagGroupName) => {
      const configs = groupedTkvs[tagGroupName].filter((config) => {
        const label = formatConfiguredTkvLabel(config);
        return (
          label.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
          tagGroupName.toLowerCase().includes(configSearchTerm.toLowerCase())
        );
      });
      if (configs.length > 0) {
        filtered[tagGroupName] = configs;
      }
    });
    return filtered;
  }, [groupedTkvs, configSearchTerm]);

  const handleDeleteFiltered = useCallback(async () => {
    const targets = Object.values(filteredGroupedTkvs)
      .flat()
      .map((config) => ({
        tagGroupId: config.tagGroupId,
        tkvSystemId: config.systemId,
      }));
    if (targets.length === 0) {
      return;
    }
    await deleteTkvs(instanceSystemId, targets);
  }, [filteredGroupedTkvs, deleteTkvs, instanceSystemId]);

  const copyEntry = useCallback(
    (tkv: ConfiguredTkv) => {
      void copyTkvEntry(formatConfiguredTkvLabel(tkv));
    },
    [],
  );

  const editingTkv =
    activeOperation.type === 'editing'
      ? configuredTkvs[activeOperation.index]
      : undefined;
  const editingTkvId = editingTkv
    ? buildTkvId(editingTkv.tagGroupId, editingTkv.keyValuePairs)
    : undefined;

  const showParametersSection = activeOperation.type !== 'idle';
  const showAvailableTagsTable = activeOperation.type === 'adding';
  const applyButtonLabel = activeOperation.type === 'adding' ? 'Add' : 'Update';

  if (Object.keys(moduleTagKeys).length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-secondary">
          No module tag keys available
        </div>
      </div>
    );
  }

  const configuredTkvsSummary = (
    <div
      ref={configSectionRef}
      className="bg-primary border-neutral-02 overflow-hidden rounded-md border shadow-sm"
    >
      <div className="bg-secondary border-neutral-02 flex items-center justify-between gap-2 border-b px-1 py-1">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="Toggle Configured TKVs section"
            icon={
              isConfigSectionCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            }
            onClick={() =>
              setIsConfigSectionCollapsed(!isConfigSectionCollapsed)
            }
            variant="ghost"
          />
          <h2 className="text-neutral-primary text-base font-semibold">
            Configured TKVs
          </h2>
        </div>

        {Object.keys(groupedTkvs).length > 0 && (
          <div className="m-0.5 flex-1">
            <ArcSearchBar
              onSearchChange={setConfigSearchTerm}
              placeholder="Search configured TKVs..."
              searchTerm={configSearchTerm}
            />
          </div>
        )}

        {configSearchTerm &&
          Object.keys(filteredGroupedTkvs).length > 0 &&
          isEditable && (
            <Button
              className="flex items-center gap-1.5"
              disabled={activeOperation.type !== 'idle'}
              emphasis="danger"
              onClick={() => void handleDeleteFiltered()}
              startIcon={Trash2}
              title={`Delete ${Object.values(filteredGroupedTkvs).flat().length} filtered TKV(s)`}
              variant="ghost"
            >
              Delete ({Object.values(filteredGroupedTkvs).flat().length})
            </Button>
          )}

        {isEditable && (
          <Button
            className="mr-2 inline-flex items-center"
            disabled={activeOperation.type !== 'idle'}
            emphasis="primary"
            onClick={handleAddClick}
            startIcon={Plus}
            title="Add configuration"
            variant="fill"
          >
            Add
          </Button>
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isConfigSectionCollapsed
            ? 'max-h-0 overflow-hidden'
            : 'max-h-[200px] overflow-auto'
        }`}
      >
        <div className="p-4">
          {Object.keys(filteredGroupedTkvs).length === 0 ? (
            <div className="text-neutral-secondary text-center">
              {configSearchTerm ? (
                <p>No TKVs match your search</p>
              ) : (
                <p>No tags configured</p>
              )}
            </div>
          ) : (
            Object.keys(filteredGroupedTkvs).map((tagGroupName) => {
              const configs = filteredGroupedTkvs[tagGroupName];
              const highlightedEntryIndexRaw =
                editingTkvId !== undefined &&
                tagGroupName === editingTkv?.tagGroup
                  ? configs.findIndex(
                      (config) =>
                        buildTkvId(config.tagGroupId, config.keyValuePairs) ===
                        editingTkvId,
                    )
                  : -1;

              return (
                <TagGroupSummary
                  key={tagGroupName}
                  configurations={configs}
                  hasActiveSearch={!!configSearchTerm}
                  highlightedEntryIndex={
                    highlightedEntryIndexRaw === -1
                      ? undefined
                      : highlightedEntryIndexRaw
                  }
                  isActionsDisabled={showParametersSection}
                  isEditable={isEditable}
                  onCopyEntry={copyEntry}
                  onDeleteItem={(id) => void handleDeleteItem(id)}
                  onDeleteTagGroup={(tagGroupName) =>
                    void handleDeleteTagGroup(tagGroupName)
                  }
                  onEditItem={handleEditItem}
                  tagGroupName={tagGroupName}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {showParametersSection && (
        <>
          <div ref={scrollAnchorRef}>
            <TkvParametersSection
              isEditable={isEditable}
              onParametersChange={setParameters}
              parameters={parameters}
              visible={showParametersSection}
            />
          </div>

          {showAvailableTagsTable && (
            <>
              <KvVectorEditor
                ariaLabel="Search module tag keys or values"
                clearable
                onSuggestionCommit={handleSuggestionCommit}
                onTextChange={handleSearchTextChange}
                placeholder="Search module tag keys or values..."
                suggestions={availableSuggestions}
                text={availableSearchTerm}
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

              {searchDiagnostic && (
                <div className="text-support-danger text-sm" role="alert">
                  {searchDiagnostic.valueName} is ambiguous between{' '}
                  {searchDiagnostic.candidateKeyNames.join(', ')}; resolved to
                  the lowest-ID key.
                </div>
              )}

              <div className="bg-primary border-neutral-02 overflow-hidden rounded border shadow-sm">
                <div className="bg-secondary border-neutral-02 text-neutral-primary sticky top-0 z-10 flex items-center border-b-2 px-3 py-2 text-sm font-semibold">
                  <span className="w-3.5"></span>
                  <button
                    className="hover:text-brand-primary text-neutral-primary ml-3 flex w-32 cursor-pointer items-center gap-1 select-none"
                    onClick={() => handleSort('id')}
                    type="button"
                  >
                    <span>Tag ID</span>
                    {getSortIcon('id')}
                  </button>
                  <button
                    className="hover:text-brand-primary text-neutral-primary ml-3 flex flex-1 cursor-pointer items-center gap-1 text-left select-none"
                    onClick={() => handleSort('name')}
                    type="button"
                  >
                    <span>Tag</span>
                    {getSortIcon('name')}
                  </button>
                </div>

                <div className="max-h-[35vh] overflow-y-auto">
                  {filteredAndSortedTagGroups.map((tagGroupName) => {
                      const tagGroup = moduleTagKeys[tagGroupName];
                      const isExpanded = expandedTagGroups.includes(
                        tagGroup.id,
                      );
                      const isSelected = selectedTagGroup === tagGroup.id;
                      // A key/value id can collide across unrelated tag
                      // groups, so selection state must only ever render for
                      // the locked tag group — otherwise checking a value in
                      // one tag group visually "leaks" a check mark onto a
                      // same-id key/value in a different, unselected tag.
                      const isLockedTagGroup =
                        selectedTagGroup === null ||
                        selectedTagGroup === tagGroup.id;

                      return (
                        <div
                          key={tagGroupName}
                          className="border-neutral-02 border-b last:border-b-0"
                        >
                          <div
                            className={`flex cursor-pointer items-center px-3 py-2.5 transition-colors ${
                              isSelected
                                ? 'bg-support-info-subtle'
                                : 'hover:bg-neutral-03 bg-transparent'
                            }`}
                            onClick={() => toggleTagGroupExpansion(tagGroup.id)}
                          >
                            <span className="text-neutral-secondary w-3.5">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <input
                              checked={isSelected}
                              className="ml-3 h-4 w-4 cursor-pointer"
                              disabled={!isEditable}
                              name="tag-group"
                              onChange={() => setSelectedTagGroup(tagGroup.id)}
                              onClick={(e) => e.stopPropagation()}
                              type="radio"
                            />
                            <div className="text-neutral-secondary ml-3 w-32 font-mono text-sm">
                              {ConvertNumberToHexString(tagGroup.id) ||
                                tagGroup.id}
                            </div>
                            <div className="text-neutral-primary ml-3 flex-1 text-sm font-medium">
                              {tagGroupName}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-primary">
                              {Object.keys(tagGroup.keys).map((modKeyName) => {
                                const modKey = tagGroup.keys[modKeyName];
                                const isModKeyExpanded =
                                  expandedModKeys[modKey.id];
                                const allValuesSelected =
                                  isLockedTagGroup &&
                                  modKey.values.every(
                                    (v) => selectedValues[modKey.id]?.[v.id],
                                  );
                                const someValuesSelected =
                                  isLockedTagGroup &&
                                  modKey.values.some(
                                    (v) => selectedValues[modKey.id]?.[v.id],
                                  );

                                return (
                                  <div key={modKeyName}>
                                    <div
                                      className={`border-neutral-02 flex cursor-pointer items-center border-b px-3 py-2 pl-16 transition-colors ${
                                        allValuesSelected
                                          ? 'bg-support-info-subtle'
                                          : 'bg-secondary hover:bg-neutral-03'
                                      }`}
                                      onClick={() =>
                                        toggleModKeyExpansion(modKey.id)
                                      }
                                    >
                                      <span className="text-neutral-secondary w-3">
                                        {isModKeyExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </span>
                                      <input
                                        ref={(input) => {
                                          if (input) {
                                            input.indeterminate =
                                              !allValuesSelected &&
                                              someValuesSelected;
                                          }
                                        }}
                                        checked={allValuesSelected}
                                        className="ml-2 h-4 w-4 cursor-pointer"
                                        disabled={!isEditable}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleModKeySelection(
                                            tagGroup.id,
                                            modKey.id,
                                          );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        type="checkbox"
                                      />
                                      <span className="text-neutral-primary mr-2 ml-3 w-32 font-mono text-sm">
                                        {ConvertNumberToHexString(modKey.id) ||
                                          modKey.id}
                                      </span>
                                      <span className="text-neutral-primary text-sm font-medium">
                                        {modKeyName}
                                      </span>
                                    </div>

                                    {isModKeyExpanded && (
                                      <div>
                                        {modKey.values.map((value) => (
                                          <div
                                            key={value.id}
                                            className={`border-neutral-03 flex items-center gap-3 border-t px-3 py-2 pl-[88px] transition-colors ${
                                              isLockedTagGroup &&
                                              selectedValues[modKey.id]?.[
                                                value.id
                                              ]
                                                ? 'bg-support-info-subtle'
                                                : 'bg-transparent'
                                            }`}
                                          >
                                            <Checkbox
                                              aria-label={`Select ${value.name}`}
                                              checked={
                                                (isLockedTagGroup &&
                                                  selectedValues[modKey.id]?.[
                                                    value.id
                                                  ]) ||
                                                false
                                              }
                                              disabled={!isEditable}
                                              onCheckedChange={() =>
                                                toggleValueSelection(
                                                  modKey.id,
                                                  value.id,
                                                  tagGroup.id,
                                                )
                                              }
                                              size="sm"
                                            />
                                            <div className="text-neutral-secondary w-32 font-mono text-sm">
                                              {ConvertNumberToHexString(
                                                value.id,
                                              ) || value.id}
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
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {isEditable && (
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
                disabled={!hasPendingParameterChange}
                emphasis="primary"
                onClick={() => void handleApply()}
                size="sm"
                variant="fill"
              >
                {applyButtonLabel}
              </Button>
            </div>
          )}
        </>
      )}

      {configuredTkvsSummary}
    </div>
  );
}
