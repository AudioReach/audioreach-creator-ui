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

import {
  selectConfiguredTkvs,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import ArcSearchBar from '~shared/controls/arc-search-bar';
import {showToast} from '~shared/controls/global-toaster';
import type {KeyDisplayMode} from '~shared/lib/key-display-mode';
import {logger} from '~shared/lib/logger';
import type {
  Key,
  KeyValue,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '../../../ui/kv-vector-editor';
import {formatConfiguredTkvLabel} from '../../lib/tkv-display-format';
import {
  getTkvSearchSuggestions,
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
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
  tkvDisplayMode: KeyDisplayMode;
}

type ActiveTkvOperation =
  {type: 'idle'} | {type: 'adding'} | {index: number; type: 'editing'};

function tagGroupMatchesSearch(
  tagGroupName: string,
  tagGroup: TagGroup,
  searchTerm: string,
  searchNumber: number | null,
): boolean {
  const tagGroupMatches =
    tagGroupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (searchNumber !== null && tagGroup.id === searchNumber);
  const hasMatchingContent = Object.entries(tagGroup.keys).some(
    ([modKeyName, modKey]) => {
      const keyMatches =
        modKeyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (searchNumber !== null && modKey.id === searchNumber);
      const valueMatches = modKey.values.some(
        (v) =>
          v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (searchNumber !== null && v.id === searchNumber),
      );
      return keyMatches || valueMatches;
    },
  );
  return tagGroupMatches || hasMatchingContent;
}

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

function partitionTagGroupsBySelection(
  names: string[],
  moduleTagKeys: Record<string, TagGroup>,
  selectedValues: Record<number, Record<number, boolean>>,
): string[] {
  const hasSelection = (name: string) =>
    Object.values(moduleTagKeys[name].keys).some((modKey) =>
      modKey.values.some((v) => selectedValues[modKey.id]?.[v.id]),
    );
  const withSelected = names.filter((name) => hasSelection(name));
  const withoutSelected = names.filter((name) => !hasSelection(name));
  return [...withSelected, ...withoutSelected];
}

function resolveTagGroupIdForKey(
  moduleTagKeys: Record<string, TagGroup>,
  keyId: number,
): number | null {
  const tagGroup = Object.values(moduleTagKeys).find((candidate) =>
    Object.values(candidate.keys).some((modKey) => modKey.id === keyId),
  );
  return tagGroup?.id ?? null;
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

function buildTkvSystemId(
  keyValuePairs: Array<{key: Key; value: KeyValue}>,
): string {
  return keyValuePairs
    .map((pair) => `${pair.key.systemId}:${pair.value.systemId}`)
    .sort()
    .join('|');
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
  instanceSystemId,
  isEditable,
  moduleId: _moduleId,
  tkvDisplayMode,
}: ModuleTagKeysConfigPanelProps) {
  const {
    addConfiguredTkv,
    graphData,
    moduleDefinitionsBySystemId,
    moduleTagKeys,
    removeConfiguredTkv,
    updateConfiguredTkvs,
  } = useGraphDesignerStoreShallow((state) => ({
    addConfiguredTkv: state.addConfiguredTkv,
    graphData: state.graphData,
    moduleDefinitionsBySystemId: state.moduleDefinitionsBySystemId,
    moduleTagKeys: state.moduleTagKeys,
    removeConfiguredTkv: state.removeConfiguredTkv,
    updateConfiguredTkvs: state.updateConfiguredTkvs,
  }));

  // selectConfiguredTkvs re-derives a fresh array on every call, so it must
  // be memoized here rather than invoked inside the
  // useGraphDesignerStoreShallow selector itself — doing so there defeats
  // useShallow's comparison (new array identity every render) and triggers
  // React's "getSnapshot should be cached" infinite-loop warning.
  const configuredTkvs = useMemo(
    () => selectConfiguredTkvs({graphData, moduleTagKeys}, instanceSystemId),
    [graphData, moduleTagKeys, instanceSystemId],
  );

  const moduleDefinitionSystemId =
    graphData?.moduleInstances[instanceSystemId]?.moduleDefinitionSystemId;
  const paramDefinitionsSummaryInfo = useMemo(
    () =>
      (moduleDefinitionSystemId !== undefined
        ? moduleDefinitionsBySystemId[moduleDefinitionSystemId]
            ?.paramDefinitionsSummaryInfo
        : undefined) ?? [],
    [moduleDefinitionSystemId, moduleDefinitionsBySystemId],
  );

  const baselineParameters = useMemo<TkvParameter[]>(
    () => transformParamDefinitionsToTKVParameters(paramDefinitionsSummaryInfo),
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
  const [initialEditSelections, setInitialEditSelections] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [expandedTagGroups, setExpandedTagGroups] = useState<number[]>([]);
  const [expandedModKeys, setExpandedModKeys] = useState<
    Record<number, boolean>
  >({});
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isConfigSectionCollapsed, setIsConfigSectionCollapsed] =
    useState(false);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  const resetPickerState = useCallback(() => {
    setSelectedValues({});
    setSelectedTagGroup(null);
    setInitialEditSelections({});
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

  // Auto-expand matching tag groups/keys while searching; collapse on clear.
  useEffect(() => {
    if (!availableSearchTerm) {
      setExpandedTagGroups([]);
      setExpandedModKeys({});
      return;
    }
    const searchNumber = ConvertStringToNumber(availableSearchTerm);
    const matchingNames = Object.keys(moduleTagKeys).filter((name) =>
      tagGroupMatchesSearch(
        name,
        moduleTagKeys[name],
        availableSearchTerm,
        searchNumber,
      ),
    );
    setExpandedTagGroups(matchingNames.map((name) => moduleTagKeys[name].id));
    const allModKeys: Record<number, boolean> = {};
    matchingNames.forEach((name) => {
      Object.values(moduleTagKeys[name].keys).forEach((modKey) => {
        allModKeys[modKey.id] = true;
      });
    });
    setExpandedModKeys(allModKeys);
  }, [availableSearchTerm, moduleTagKeys]);

  const filteredAndSortedTagGroups = useMemo(() => {
    let names = Object.keys(moduleTagKeys);
    if (availableSearchTerm) {
      const searchNumber = ConvertStringToNumber(availableSearchTerm);
      names = names.filter((name) =>
        tagGroupMatchesSearch(
          name,
          moduleTagKeys[name],
          availableSearchTerm,
          searchNumber,
        ),
      );
    }
    names = sortTagGroupNames(names, moduleTagKeys, sortColumn, sortOrder);
    if (
      activeOperation.type === 'editing' &&
      Object.keys(initialEditSelections).length > 0
    ) {
      names = partitionTagGroupsBySelection(
        names,
        moduleTagKeys,
        initialEditSelections,
      );
    }
    return names;
  }, [
    moduleTagKeys,
    availableSearchTerm,
    sortColumn,
    sortOrder,
    activeOperation,
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

  const toggleValueSelection = useCallback(
    (modKeyId: number, valueId: number, tagGroupId: number) => {
      if (selectedTagGroup !== null && selectedTagGroup !== tagGroupId) {
        setSelectedValues({[modKeyId]: {[valueId]: true}});
        setSelectedTagGroup(tagGroupId);
        return;
      }

      const wasSelected = Boolean(selectedValues[modKeyId]?.[valueId]);
      setSelectedValues((prev) => ({
        ...prev,
        [modKeyId]: {
          ...prev[modKeyId],
          [valueId]: !wasSelected,
        },
      }));

      if (!wasSelected) {
        setSelectedTagGroup(tagGroupId);
        return;
      }

      const tagGroupName = Object.keys(moduleTagKeys).find(
        (name) => moduleTagKeys[name].id === tagGroupId,
      );
      const stillHasSelection = tagGroupName
        ? Object.values(moduleTagKeys[tagGroupName].keys).some((modKey) =>
            modKey.values.some(
              (v) =>
                !(modKey.id === modKeyId && v.id === valueId) &&
                selectedValues[modKey.id]?.[v.id],
            ),
          )
        : false;
      if (!stillHasSelection) {
        setSelectedTagGroup(null);
      }
    },
    [selectedTagGroup, selectedValues, moduleTagKeys],
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
        setSelectedValues({[modKeyId]: nextKeySelections});
        setSelectedTagGroup(tagGroupId);
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
      setSelectedValues((prev) => ({
        ...prev,
        [modKeyId]: nextKeySelections,
      }));

      if (!allSelected) {
        setSelectedTagGroup(tagGroupId);
        return;
      }

      const hasAnySelected = Object.entries(
        moduleTagKeys[tagGroupName].keys,
      ).some(([keyName, key]) => {
        if (keyName === modKeyName) {
          return false;
        }
        return key.values.some((v) => selectedValues[key.id]?.[v.id]);
      });
      if (!hasAnySelected) {
        setSelectedTagGroup(null);
      }
    },
    [selectedTagGroup, selectedValues, moduleTagKeys],
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

  const sortedValues = useCallback(
    (modKey: {id: number; values: KeyValue[]}) => {
      if (
        activeOperation.type !== 'editing' ||
        Object.keys(initialEditSelections).length === 0
      ) {
        return modKey.values;
      }
      const keySelections = initialEditSelections[modKey.id];
      return [
        ...modKey.values.filter((v) => keySelections?.[v.id]),
        ...modKey.values.filter((v) => !keySelections?.[v.id]),
      ];
    },
    [activeOperation, initialEditSelections],
  );

  const availableSuggestions = useMemo<
    Array<KvVectorEditorSuggestion<TkvSearchSuggestion>>
  >(
    () =>
      getTkvSearchSuggestions(
        availableSearchTerm,
        moduleTagKeys,
        selectedTagGroup,
        tkvDisplayMode,
      ).map((suggestion) => ({
        id: `${suggestion.key.id}:${suggestion.value.id}`,
        primaryText: suggestion.value.name,
        secondaryText: `Key: ${suggestion.key.name}`,
        value: suggestion,
      })),
    [availableSearchTerm, moduleTagKeys, selectedTagGroup, tkvDisplayMode],
  );

  const handleSuggestionCommit = useCallback(
    (suggestion: TkvSearchSuggestion) => {
      const tagGroupId = resolveTagGroupIdForKey(
        moduleTagKeys,
        suggestion.key.id,
      );
      if (tagGroupId === null) {
        return;
      }
      toggleValueSelection(suggestion.key.id, suggestion.value.id, tagGroupId);
      // Reflect the committed suggestion's value name into the search box.
      // availableSearchTerm also drives the table/suggestion filters, so this
      // must stay a plain name the value matches against itself — a bracketed
      // "[Key: Value]" string (key-value display mode) would filter both down
      // to empty since no plain name contains that literal text.
      setAvailableSearchTerm(suggestion.value.name);
    },
    [moduleTagKeys, toggleValueSelection],
  );

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setAvailableSearchTerm(text);

      if (!text.trim()) {
        setSelectedValues({});
        setSelectedTagGroup(null);
        setSearchDiagnostic(null);
        return;
      }

      const resolved = resolveTkvSearchInput(
        text,
        moduleTagKeys,
        selectedTagGroup,
        tkvDisplayMode,
      );
      if (resolved.kind !== 'selection' && resolved.kind !== 'ambiguous') {
        setSearchDiagnostic(null);
        return;
      }

      const nextSelectedValues: Record<number, Record<number, boolean>> = {
        ...selectedValues,
      };
      let tagGroupId = selectedTagGroup;
      resolved.pairs.forEach((pair) => {
        nextSelectedValues[pair.key.id] = {
          ...nextSelectedValues[pair.key.id],
          [pair.value.id]: true,
        };
        if (tagGroupId === null) {
          tagGroupId = resolveTagGroupIdForKey(moduleTagKeys, pair.key.id);
        }
      });
      setSelectedValues(nextSelectedValues);
      if (tagGroupId !== null) {
        setSelectedTagGroup(tagGroupId);
      }
      setSearchDiagnostic(
        resolved.kind === 'ambiguous' ? resolved.diagnostic : null,
      );
    },
    [moduleTagKeys, selectedTagGroup, selectedValues, tkvDisplayMode],
  );

  const handleAddClick = useCallback(() => {
    setActiveOperation({type: 'adding'});
    resetPickerState();
    setParameters(baselineParameters);

    setTimeout(() => {
      searchBarRef.current?.scrollIntoView({
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

      const nextSelectedValues: Record<number, Record<number, boolean>> = {};
      const keysToExpand: number[] = [];
      tkv.keyValuePairs.forEach((pair) => {
        nextSelectedValues[pair.key.id] = {
          ...nextSelectedValues[pair.key.id],
          [pair.value.id]: true,
        };
        if (!keysToExpand.includes(pair.key.id)) {
          keysToExpand.push(pair.key.id);
        }
      });

      setSelectedValues(nextSelectedValues);
      setInitialEditSelections(nextSelectedValues);
      setSelectedTagGroup(tkv.tagGroupId);
      setExpandedTagGroups([tkv.tagGroupId]);

      const expandedKeysObj: Record<number, boolean> = {};
      keysToExpand.forEach((keyId) => {
        expandedKeysObj[keyId] = true;
      });
      setExpandedModKeys(expandedKeysObj);
      setAvailableSearchTerm('');
      setParameters(
        baselineParameters.map((param) => ({
          ...param,
          checked: tkv.pidConfig.includes(param.pid),
        })),
      );

      setTimeout(() => {
        searchBarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [configuredTkvs, baselineParameters],
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      const index = configuredTkvs.findIndex(
        (tkv) => buildTkvId(tkv.tagGroupId, tkv.keyValuePairs) === id,
      );
      if (index === -1) {
        return;
      }
      removeConfiguredTkv(instanceSystemId, index);

      if (
        activeOperation.type === 'editing' &&
        activeOperation.index === index
      ) {
        setActiveOperation({type: 'idle'});
        resetPickerState();
        setParameters(baselineParameters);
      }
    },
    [
      configuredTkvs,
      removeConfiguredTkv,
      instanceSystemId,
      activeOperation,
      resetPickerState,
      baselineParameters,
    ],
  );

  const handleDeleteTagGroup = useCallback(
    (tagGroupName: string) => {
      if (activeOperation.type === 'editing') {
        const editingTkv = configuredTkvs[activeOperation.index];
        if (editingTkv && editingTkv.tagGroup === tagGroupName) {
          setActiveOperation({type: 'idle'});
          resetPickerState();
          setParameters(baselineParameters);
        }
      }
      updateConfiguredTkvs(
        instanceSystemId,
        configuredTkvs.filter((tkv) => tkv.tagGroup !== tagGroupName),
      );
    },
    [
      configuredTkvs,
      activeOperation,
      updateConfiguredTkvs,
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

  const handleApply = useCallback(() => {
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

    const checkedPids = parameters.filter((p) => p.checked).map((p) => p.pid);
    if (checkedPids.length === 0) {
      showToast('Please select at least one PID', 'warning');
      return;
    }

    const selectedPerKey = groupSelectedValuesByKey(selectedValues, tagGroup);
    if (selectedPerKey.length === 0 && Object.keys(tagGroup.keys).length > 0) {
      showToast('Please select at least one value', 'warning');
      return;
    }

    const combinations = generateCartesianProduct(selectedPerKey);
    const newConfigs: ConfiguredTkv[] = (
      combinations.length > 0 ? combinations : [[]]
    ).map((keyValuePairs) => ({
      keyValuePairs,
      pidConfig: checkedPids,
      systemId: buildTkvSystemId(keyValuePairs),
      tagGroup: tagGroupName,
      tagGroupId: tagGroup.id,
    }));

    if (activeOperation.type === 'editing') {
      const editIndex = activeOperation.index;
      const edited = newConfigs[0];
      updateConfiguredTkvs(
        instanceSystemId,
        configuredTkvs.map((tkv, i) =>
          i === editIndex ? {...edited, systemId: tkv.systemId} : tkv,
        ),
      );
    } else {
      const existingSignatures = new Set(
        configuredTkvs.map((tkv) =>
          buildTkvSignature(tkv.tagGroupId, tkv.keyValuePairs),
        ),
      );
      const uniqueNewConfigs = newConfigs.filter((config) => {
        const signature = buildTkvSignature(
          config.tagGroupId,
          config.keyValuePairs,
        );
        if (existingSignatures.has(signature)) {
          return false;
        }
        existingSignatures.add(signature);
        return true;
      });
      uniqueNewConfigs.forEach((config) =>
        addConfiguredTkv(instanceSystemId, config),
      );
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
    selectedTagGroup,
    moduleTagKeys,
    parameters,
    selectedValues,
    activeOperation,
    configuredTkvs,
    updateConfiguredTkvs,
    addConfiguredTkv,
    instanceSystemId,
    resetPickerState,
    baselineParameters,
  ]);

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
        const label = formatConfiguredTkvLabel(config, tkvDisplayMode);
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
  }, [groupedTkvs, configSearchTerm, tkvDisplayMode]);

  const handleDeleteFiltered = useCallback(() => {
    const indices: number[] = [];
    Object.values(filteredGroupedTkvs).forEach((configs) => {
      configs.forEach((config) => {
        const id = buildTkvId(config.tagGroupId, config.keyValuePairs);
        const index = configuredTkvs.findIndex(
          (tkv) => buildTkvId(tkv.tagGroupId, tkv.keyValuePairs) === id,
        );
        if (index !== -1) {
          indices.push(index);
        }
      });
    });
    indices.sort((a, b) => b - a);
    indices.forEach((index) => removeConfiguredTkv(instanceSystemId, index));
  }, [
    filteredGroupedTkvs,
    configuredTkvs,
    removeConfiguredTkv,
    instanceSystemId,
  ]);

  const copyEntry = useCallback(
    (tkv: ConfiguredTkv) => {
      void copyTkvEntry(formatConfiguredTkvLabel(tkv, tkvDisplayMode));
    },
    [tkvDisplayMode],
  );

  const editingTkv =
    activeOperation.type === 'editing'
      ? configuredTkvs[activeOperation.index]
      : undefined;
  const editingTkvId = editingTkv
    ? buildTkvId(editingTkv.tagGroupId, editingTkv.keyValuePairs)
    : undefined;

  const showSearchAndList = activeOperation.type !== 'idle';

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
              emphasis="danger"
              onClick={handleDeleteFiltered}
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
                  displayMode={tkvDisplayMode}
                  hasActiveSearch={!!configSearchTerm}
                  highlightedEntryIndex={
                    highlightedEntryIndexRaw === -1
                      ? undefined
                      : highlightedEntryIndexRaw
                  }
                  isActionsDisabled={showSearchAndList}
                  isEditable={isEditable}
                  onCopyEntry={copyEntry}
                  onDeleteItem={handleDeleteItem}
                  onDeleteTagGroup={handleDeleteTagGroup}
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
      {showSearchAndList && (
        <>
          <TkvParametersSection
            isEditable={isEditable}
            onParametersChange={setParameters}
            parameters={parameters}
            visible={showSearchAndList}
          />

          <div ref={searchBarRef}>
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
          </div>

          {searchDiagnostic && (
            <div className="text-support-danger text-sm" role="alert">
              {searchDiagnostic.valueName} is ambiguous between{' '}
              {searchDiagnostic.candidateKeyNames.join(', ')}; resolved to the
              lowest-ID key.
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
              {filteredAndSortedTagGroups.length === 0 ? (
                <div className="text-neutral-secondary flex flex-col items-center justify-center py-12">
                  <p>No module tag keys or values match your search</p>
                </div>
              ) : (
                filteredAndSortedTagGroups.map((tagGroupName) => {
                  const tagGroup = moduleTagKeys[tagGroupName];
                  const isExpanded = expandedTagGroups.includes(tagGroup.id);
                  const isSelected = selectedTagGroup === tagGroup.id;

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
                          {ConvertNumberToHexString(tagGroup.id) || tagGroup.id}
                        </div>
                        <div className="text-neutral-primary ml-3 flex-1 text-sm font-medium">
                          {tagGroupName}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-primary">
                          {Object.keys(tagGroup.keys).map((modKeyName) => {
                            const modKey = tagGroup.keys[modKeyName];
                            const isModKeyExpanded = expandedModKeys[modKey.id];
                            const allValuesSelected = modKey.values.every(
                              (v) => selectedValues[modKey.id]?.[v.id],
                            );
                            const someValuesSelected = modKey.values.some(
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
                                    {sortedValues(modKey).map((value) => (
                                      <div
                                        key={value.id}
                                        className={`border-neutral-03 flex items-center gap-3 border-t px-3 py-2 pl-[88px] transition-colors ${
                                          selectedValues[modKey.id]?.[value.id]
                                            ? 'bg-support-info-subtle'
                                            : 'bg-transparent'
                                        }`}
                                      >
                                        <Checkbox
                                          aria-label={`Select ${value.name}`}
                                          checked={
                                            selectedValues[modKey.id]?.[
                                              value.id
                                            ] || false
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
                                          {ConvertNumberToHexString(value.id) ||
                                            value.id}
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
                })
              )}
            </div>
          </div>

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
                emphasis="primary"
                onClick={handleApply}
                size="sm"
                variant="fill"
              >
                Apply
              </Button>
            </div>
          )}
        </>
      )}

      {configuredTkvsSummary}
    </div>
  );
}
