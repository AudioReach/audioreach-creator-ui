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

import ArcSearchBar from '~shared/controls/arc-search-bar';
import type {
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import {useModuleTagKeysStore} from '../../../model/module-tag-keys-store';

import type {ConfiguredTkv, TkvParameter} from './module-tag-keys-config.types';
import {TagGroupSummary} from './tag-group-summary';
import {TkvParametersSection} from './tkv-parameters-section';

interface ModuleTagKeysConfigPanelProperties {
  instanceId: number;
  isEditable: boolean;
  moduleId: number;
}

export function ModuleTagKeysConfigPanel({
  instanceId,
  isEditable,
  moduleId,
}: ModuleTagKeysConfigPanelProperties) {
  // Store state
  const availableModuleTags = useModuleTagKeysStore(
    (state) => state.availableModuleTags,
  );

  const storeParameters = useModuleTagKeysStore(
    (state) => state.moduleParameters[moduleId],
  );
  const configuredModuleTags = useModuleTagKeysStore(
    (state) => state.configuredModuleTags,
  );

  // Store actions
  const updateConfiguredTagKeyValues = useModuleTagKeysStore(
    (state) => state.updateConfiguredTagKeyValues,
  );
  const addConfiguredTagKeyValue = useModuleTagKeysStore(
    (state) => state.addConfiguredTagKeyValue,
  );
  const removeConfiguredTagKeyValue = useModuleTagKeysStore(
    (state) => state.removeConfiguredTagKeyValue,
  );

  const [parameters, setParameters] = useState<TkvParameter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<Record<number, boolean>>(
    {},
  );
  const [expandedTagGroups, setExpandedTagGroups] = useState<number[]>([]);
  const [expandedModuleKeys, setExpandedModuleKeys] = useState<
    Record<number, boolean>
  >({});
  const [selectedTagGroup, setSelectedTagGroup] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSearchAndList, setShowSearchAndList] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialEditSelections, setInitialEditSelections] = useState<
    Record<number, boolean>
  >({});
  const [isConfigSectionCollapsed, setIsConfigSectionCollapsed] =
    useState(false);
  const configSectionReference = useRef<HTMLDivElement>(null);
  const searchBarReference = useRef<HTMLDivElement>(null);

  // Sync parameters with store when store updates
  useEffect(() => {
    if (storeParameters && storeParameters.length > 0) {
      setParameters(storeParameters);
    }
  }, [storeParameters]);

  // Get configured keys for this module instance from store
  const configuredTKVs = useMemo(() => {
    const moduleInstances = configuredModuleTags[moduleId] || [];
    const instance = moduleInstances.find(
      (inst: {instanceId: number}) => inst.instanceId === instanceId,
    );
    return instance?.tagKeyValueList || [];
  }, [configuredModuleTags, moduleId, instanceId]);

  const availableModuleTagsInfo = useMemo(
    () => availableModuleTags || {},
    [availableModuleTags],
  );

  // Helper function to partition tag groups by selection
  const partitionTagGroupsBySelection = useCallback(
    (
      tagGroups: string[],
      selectedValues: Record<number, boolean>,
    ): string[] => {
      const groupsWithSelectedValues = tagGroups.filter((tagGroupName) => {
        const tagGroup = availableModuleTagsInfo[tagGroupName];
        return Object.keys(tagGroup.keys).some((moduleKeyName) => {
          const moduleKey = tagGroup.keys[moduleKeyName];
          return moduleKey.values.some((v: {id: number}) => selectedValues[v.id]);
        });
      });
      const groupsWithoutSelectedValues = tagGroups.filter((tagGroupName) => {
        const tagGroup = availableModuleTagsInfo[tagGroupName];
        return !Object.keys(tagGroup.keys).some((moduleKeyName) => {
          const moduleKey = tagGroup.keys[moduleKeyName];
          return moduleKey.values.some((v: {id: number}) => selectedValues[v.id]);
        });
      });
      return [...groupsWithSelectedValues, ...groupsWithoutSelectedValues];
    },
    [availableModuleTagsInfo],
  );

  // Filter and sort tag groups
  const filteredAndSortedTagGroups = useMemo(() => {
    let tagGroups = Object.keys(availableModuleTagsInfo);

    // Filter by search term
    if (searchTerm) {
      const searchNumber = ConvertStringToNumber(searchTerm);
      tagGroups = tagGroups.filter((tagGroupName) => {
        const tagGroup = availableModuleTagsInfo[tagGroupName];

        // Check if tag group name or ID matches
        const tagGroupMatches =
          tagGroupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (searchNumber !== null && tagGroup.id === searchNumber);

        // Check if any module keys or values match
        let hasMatchingContent = false;
        for (const moduleKeyName of Object.keys(tagGroup.keys)) {
          const moduleKey = tagGroup.keys[moduleKeyName];
          const keyMatches =
            moduleKeyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (searchNumber !== null && moduleKey.id === searchNumber);
          const valueMatches = moduleKey.values.some(
            (v: {id: number; name: string}) =>
              v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (searchNumber !== null && v.id === searchNumber),
          );
          if (keyMatches || valueMatches) {
            hasMatchingContent = true;
          }
        }

        return tagGroupMatches || hasMatchingContent;
      });

      // Auto-expand all filtered tag groups and their keys when searching
      const tagGroupIds = tagGroups.map(
        (name) => availableModuleTagsInfo[name].id,
      );
      setExpandedTagGroups(tagGroupIds);

      // Also expand all module keys in the filtered tag groups
      const allModuleKeys: Record<number, boolean> = {};
      for (const tagGroupName of tagGroups) {
        const tagGroup = availableModuleTagsInfo[tagGroupName];
        for (const moduleKeyName of Object.keys(tagGroup.keys)) {
          const moduleKeyId = tagGroup.keys[moduleKeyName].id;
          allModuleKeys[moduleKeyId] = true;
        }
      }
      setExpandedModuleKeys(allModuleKeys);
    } else {
      // When search is cleared, collapse everything
      setExpandedTagGroups([]);
      setExpandedModuleKeys({});
    }

    // Sort tag groups
    if (sortColumn) {
      tagGroups.sort((a, b) => {
        if (sortColumn === 'id') {
          const compareA = availableModuleTagsInfo[a].id;
          const compareB = availableModuleTagsInfo[b].id;
          const comparison = compareA - compareB;
          return sortOrder === 'asc' ? comparison : -comparison;
        } else {
          const compareA = a.toLowerCase();
          const compareB = b.toLowerCase();
          const comparison = compareA.localeCompare(compareB);
          return sortOrder === 'asc' ? comparison : -comparison;
        }
      });
    }

    // When editing, move tag groups with INITIAL selected values to the top
    if (
      editingIndex !== null &&
      Object.keys(initialEditSelections).length > 0
    ) {
      tagGroups = partitionTagGroupsBySelection(
        tagGroups,
        initialEditSelections,
      );
    }

    return tagGroups;
  }, [
    availableModuleTagsInfo,
    searchTerm,
    sortColumn,
    editingIndex,
    initialEditSelections,
    sortOrder,
    partitionTagGroupsBySelection,
  ]);

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'));
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

  const toggleTagGroupExpansion = useCallback((tagGroupId: number) => {
    setExpandedTagGroups((previous) =>
      previous.includes(tagGroupId)
        ? previous.filter((t) => t !== tagGroupId)
        : [...previous, tagGroupId],
    );
  }, []);

  const toggleModuleKeyExpansion = useCallback((moduleKeyId: number) => {
    setExpandedModuleKeys((previous) => ({
      ...previous,
      [moduleKeyId]: !previous[moduleKeyId],
    }));
  }, []);

  const toggleValueSelection = useCallback(
    (valueId: number, tagGroupId: number, event?: React.MouseEvent) => {
      // Only proceed if event is from checkbox or not provided
      if (event && (event.target as HTMLElement).tagName !== 'INPUT') {
        return;
      }

      // If selecting a value from a different tag group, clear previous selections
      if (selectedTagGroup && selectedTagGroup !== tagGroupId) {
        setSelectedValues({[valueId]: true});
        setSelectedTagGroup(tagGroupId);
      } else {
        setSelectedValues((previous) => ({
          ...previous,
          [valueId]: !previous[valueId],
        }));
        // Auto-select tag group when any value is selected
        if (selectedValues[valueId]) {
          // Check if any values are still selected in this tag group
          const tagGroupName = Object.keys(availableModuleTagsInfo).find(
            (name) => availableModuleTagsInfo[name].id === tagGroupId,
          );
          if (tagGroupName) {
            const tagGroup = availableModuleTagsInfo[tagGroupName];
            const hasAnySelected = Object.keys(tagGroup.keys).some(
              (moduleKeyName) => {
                const moduleKey = tagGroup.keys[moduleKeyName];
                return moduleKey.values.some(
                  (v: {id: number}) => v.id !== valueId && selectedValues[v.id],
                );
              },
            );
            if (!hasAnySelected) {
              setSelectedTagGroup(null);
            }
          }
        } else {
          setSelectedTagGroup(tagGroupId);
        }
      }
    },
    [selectedTagGroup, selectedValues, availableModuleTagsInfo],
  );

  const toggleModuleKeySelection = useCallback(
    (tagGroupId: number, moduleKeyId: number) => {
      const tagGroupName = Object.keys(availableModuleTagsInfo).find(
        (name) => availableModuleTagsInfo[name].id === tagGroupId,
      );
      if (!tagGroupName) {
        return;
      }

      const moduleKeyName = Object.keys(
        availableModuleTagsInfo[tagGroupName].keys,
      ).find(
        (name) =>
          availableModuleTagsInfo[tagGroupName].keys[name].id === moduleKeyId,
      );
      if (!moduleKeyName) {
        return;
      }

      // If selecting from a different tag group, clear previous selections
      if (selectedTagGroup && selectedTagGroup !== tagGroupId) {
        const moduleKey = availableModuleTagsInfo[tagGroupName].keys[moduleKeyName];
        const newSelectedValues: Record<number, boolean> = {};
        moduleKey.values.forEach((v: {id: number}) => {
          newSelectedValues[v.id] = true;
        });
        setSelectedValues(newSelectedValues);
        setSelectedTagGroup(tagGroupId);
        return;
      }

      const moduleKey = availableModuleTagsInfo[tagGroupName].keys[moduleKeyName];
      const allSelected = moduleKey.values.every(
        (v: {id: number}) => selectedValues[v.id],
      );

      const newSelectedValues = {...selectedValues};
      moduleKey.values.forEach((v: {id: number}) => {
        newSelectedValues[v.id] = !allSelected;
      });
      setSelectedValues(newSelectedValues);

      // Auto-select the tag group radio when selecting values
      if (allSelected) {
        // Check if any values are still selected in this tag group
        const tagGroup = availableModuleTagsInfo[tagGroupName];
        const hasAnySelected = Object.keys(tagGroup.keys).some((keyName) => {
          if (keyName === moduleKeyName) {
            return false;
          }
          const key = tagGroup.keys[keyName];
          return key.values.some((v: {id: number}) => selectedValues[v.id]);
        });
        if (!hasAnySelected) {
          setSelectedTagGroup(null);
        }
      } else {
        setSelectedTagGroup(tagGroupId);
      }
    },
    [selectedTagGroup, selectedValues, availableModuleTagsInfo],
  );

  const handleExpandAll = useCallback(() => {
    const tagGroupIds = filteredAndSortedTagGroups.map(
      (name) => availableModuleTagsInfo[name].id,
    );
    setExpandedTagGroups(tagGroupIds);
    // Expand all mod keys in expanded tag groups
    const allModuleKeys: Record<number, boolean> = {};
    for (const tagGroupName of filteredAndSortedTagGroups) {
      const tagGroup = availableModuleTagsInfo[tagGroupName];
      for (const moduleKeyName of Object.keys(tagGroup.keys)) {
        const moduleKeyId = tagGroup.keys[moduleKeyName].id;
        allModuleKeys[moduleKeyId] = true;
      }
    }
    setExpandedModuleKeys(allModuleKeys);
  }, [filteredAndSortedTagGroups, availableModuleTagsInfo]);

  const handleCollapseAll = useCallback(() => {
    setExpandedTagGroups([]);
    setExpandedModuleKeys({});
  }, []);

  const handleAddClick = useCallback(() => {
    setEditingIndex(null);
    setSelectedValues({});
    setSelectedTagGroup(null);
    setInitialEditSelections({});
    setShowSearchAndList(true);
    setExpandedTagGroups([]);
    setExpandedModuleKeys({});
    setSearchTerm('');

    // Reset parameters to unchecked state
    setParameters((previous) => previous.map((p) => ({...p, checked: false})));

    // Scroll to search bar
    setTimeout(() => {
      searchBarReference.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, []);

  const handleApply = useCallback(() => {
    if (!selectedTagGroup) {
      alert('Please select a tag group');
      return;
    }

    // Check if at least one PID is selected
    const checkedPids = parameters.filter((p) => p.checked).map((p) => p.pid);
    if (checkedPids.length === 0) {
      alert('Please select at least one PID');
      return;
    }

    // Find tag group name and ID from selected tag group ID
    const tagGroupName = Object.keys(availableModuleTagsInfo).find(
      (name) => availableModuleTagsInfo[name].id === selectedTagGroup,
    );
    if (!tagGroupName) {
      return;
    }

    const tagGroup = availableModuleTagsInfo[tagGroupName];
    const tagGroupId = tagGroup.id;

    // Group selected values by their keys (with full Key and KeyValue objects)
    const selectedPerKey: Array<{
      key: {id: number; name: string};
      values: Array<{id: number; name: string}>;
    }> = [];

    for (const valueIdString of Object.keys(selectedValues)) {
      const valueId = Number.parseInt(valueIdString, 10);
      if (selectedValues[valueId]) {
        // Find which key this value belongs to in the selected tag group
        for (const moduleKeyName in tagGroup.keys) {
          const moduleKey = tagGroup.keys[moduleKeyName];
          const value = moduleKey.values.find(
            (v: {id: number; name: string}) => v.id === valueId,
          );
          if (value) {
            // Check if we already have this key
            let keyEntry = selectedPerKey.find(
              (entry) => entry.key.id === moduleKey.id,
            );
            if (!keyEntry) {
              keyEntry = {
                key: {id: moduleKey.id, name: moduleKey.name},
                values: [],
              };
              selectedPerKey.push(keyEntry);
            }
            keyEntry.values.push({id: value.id, name: value.name});
            break;
          }
        }
      }
    }

    // Check if no values are selected
    if (selectedPerKey.length === 0) {
      // Check if the tag group has any keys available
      const hasKeys = Object.keys(tagGroup.keys).length > 0;

      if (hasKeys) {
        // Tag has keys but none are selected - show alert
        alert('Please select at least one value');
        return;
      }
      // If tag has no keys, it's an empty tag - allow it to proceed
    }

    // Generate Cartesian product of all selected values across keys
    const combinations: Array<
      Array<{
        key: {id: number; name: string};
        value: {id: number; name: string};
      }>
    > = [];

    function generateCombinations(
      index: number,
      currentCombo: Array<{
        key: {id: number; name: string};
        value: {id: number; name: string};
      }>,
    ) {
      if (index === selectedPerKey.length) {
        combinations.push([...currentCombo]);
        return;
      }

      const {key, values} = selectedPerKey[index];
      for (const value of values) {
        currentCombo.push({key, value});
        generateCombinations(index + 1, currentCombo);
        currentCombo.pop();
      }
    }

    generateCombinations(0, []);

    // Create configurations for each combination
    const newConfigs: ConfiguredTkv[] = combinations.map((keyValuePairs) => ({
      keyValuePairs,
      pidConfig: checkedPids,
      tagGroup: tagGroupName,
      tagGroupId,
    }));

    // Get existing configs (exclude the one being edited)
    const existingConfigs =
      editingIndex === null
        ? configuredTKVs
        : configuredTKVs.filter((_, index) => index !== editingIndex);

    // Check for duplicates
    const uniqueNewConfigs: ConfiguredTkv[] = [];

    for (const newConfig of newConfigs) {
      // Create a normalized string representation for comparison using IDs
      const newConfigString = `${newConfig.tagGroupId}|${newConfig.keyValuePairs
        .map((p) => `${p.key.id}:${p.value.id}`)
        .sort()
        .join('|')}`;

      // Check if this configuration already exists
      const isDuplicate = existingConfigs.some((existingConfig) => {
        const existingConfigString = `${existingConfig.tagGroupId}|${existingConfig.keyValuePairs
          .map((p) => `${p.key.id}:${p.value.id}`)
          .sort()
          .join('|')}`;
        return existingConfigString === newConfigString;
      });

      if (!isDuplicate) {
        uniqueNewConfigs.push(newConfig);
      }
    }

    // If no unique configs to add, don't proceed
    if (uniqueNewConfigs.length === 0) {
      return;
    }

    // Update store using dedicated methods
    if (editingIndex !== null) {
      // Edit mode: Remove old entry first
      removeConfiguredTagKeyValue(moduleId, instanceId, editingIndex);
    }

    // Add new configurations
    for (const config of uniqueNewConfigs) {
      addConfiguredTagKeyValue(moduleId, instanceId, config);
    }

    // Reset state including parameters
    setSelectedValues({});
    setSelectedTagGroup(null);
    setEditingIndex(null);
    setInitialEditSelections({});
    setShowSearchAndList(false);
    setExpandedTagGroups([]);
    setExpandedModuleKeys({});
    setSearchTerm('');

    // Reset parameters to unchecked state (don't use storeParameters as it may have stale data)
    setParameters((previous) => previous.map((p) => ({...p, checked: false})));

    // Scroll to configuration section
    setTimeout(() => {
      configSectionReference.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, [
    selectedTagGroup,
    parameters,
    availableModuleTagsInfo,
    selectedValues,
    editingIndex,
    configuredTKVs,
    removeConfiguredTagKeyValue,
    moduleId,
    instanceId,
    addConfiguredTagKeyValue,
  ]);

  const handleEditTKV = useCallback(
    (id: string) => {
      // Find TKV by its composite ID
      const index = configuredTKVs.findIndex((tkv) => {
        const tkvId = `${tkv.tagGroupId}_${tkv.keyValuePairs
          .map((p) => `${p.key.id}_${p.value.id}`)
          .sort()
          .join('_')}`;
        return tkvId === id;
      });

      if (index === -1) {
        return;
      }
      const tkv = configuredTKVs[index];

      setEditingIndex(index);

      const newSelectedValues: Record<number, boolean> = {};
      const keysToExpand: number[] = [];
      const tagGroupId = tkv.tagGroupId;

      // Use the Key and KeyValue objects directly
      for (const pair of tkv.keyValuePairs) {
        newSelectedValues[pair.value.id] = true;
        // Add key to expansion list
        if (!keysToExpand.includes(pair.key.id)) {
          keysToExpand.push(pair.key.id);
        }
      }

      // Update parameters based on the TKV's pidConfig
      // Use storeParameters to ensure we have the latest data
      if (tkv.pidConfig && storeParameters && storeParameters.length > 0) {
        const pidConfigSet = new Set(tkv.pidConfig);
        const updatedParameters = storeParameters.map((parameter) => ({
          ...parameter,
          checked: pidConfigSet.has(parameter.pid),
        }));
        setParameters(updatedParameters);
      }

      setSelectedValues(newSelectedValues);
      setInitialEditSelections(newSelectedValues); // Store initial selections for sorting
      setSelectedTagGroup(tagGroupId);

      // Expand the tag group
      if (tagGroupId !== null) {
        setExpandedTagGroups([tagGroupId]);
      }

      // Expand keys with selected values
      const expandedKeysObject: Record<number, boolean> = {};
      for (const keyId of keysToExpand) {
        expandedKeysObject[keyId] = true;
      }
      setExpandedModuleKeys(expandedKeysObject);

      setShowSearchAndList(true);
      setSearchTerm('');

      // Scroll to search bar
      setTimeout(() => {
        searchBarReference.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [configuredTKVs, storeParameters],
  );

  const handleDeleteTKV = useCallback(
    (id: string) => {
      // Find TKV by its composite ID
      const index = configuredTKVs.findIndex((tkv) => {
        const tkvId = `${tkv.tagGroupId}_${tkv.keyValuePairs
          .map((p) => `${p.key.id}_${p.value.id}`)
          .sort()
          .join('_')}`;
        return tkvId === id;
      });

      if (index === -1) {
        return;
      }

      // Use dedicated remove method
      removeConfiguredTagKeyValue(moduleId, instanceId, index);

      // Clear selections if in edit mode for this item
      if (editingIndex === index && showSearchAndList) {
        setSelectedValues({});
        setSelectedTagGroup(null);
        setInitialEditSelections({});
        setExpandedTagGroups([]);
        setExpandedModuleKeys({});
        // Reset parameters to unchecked state
        setParameters((previous) => previous.map((p) => ({...p, checked: false})));
      }
    },
    [
      configuredTKVs,
      moduleId,
      instanceId,
      removeConfiguredTagKeyValue,
      editingIndex,
      showSearchAndList,
    ],
  );

  const handleDeleteTagGroup = useCallback(
    (tagGroupName: string) => {
      // Check if we're editing a TKV from this tag group
      if (editingIndex !== null && showSearchAndList) {
        const editingTKV = configuredTKVs[editingIndex];
        if (editingTKV && editingTKV.tagGroup === tagGroupName) {
          // Clear all selections since we're deleting the tag group being edited
          setSelectedValues({});
          setSelectedTagGroup(null);
          setInitialEditSelections({});
          setExpandedTagGroups([]);
          setExpandedModuleKeys({});
          setParameters((previous) => previous.map((p) => ({...p, checked: false})));
          setEditingIndex(null);
          setShowSearchAndList(false);
        }
      }

      const updatedConfigs = configuredTKVs.filter(
        (t: ConfiguredTkv) => t.tagGroup !== tagGroupName,
      );
      updateConfiguredTagKeyValues(moduleId, instanceId, updatedConfigs);
    },
    [
      configuredTKVs,
      moduleId,
      instanceId,
      updateConfiguredTagKeyValues,
      editingIndex,
      showSearchAndList,
    ],
  );

  const handleCancel = useCallback(() => {
    const hasSelections = Object.values(selectedValues).some(Boolean);
    const isConfirmed: boolean = true;
    if (hasSelections) {
      // if (
      //   window.confirm(
      //     "Are you sure you want to cancel? All selections will be lost.",
      //   ) === false
      // ) {
      //   isConfirmed = false
      // }
    }

    if (isConfirmed) {
      setShowSearchAndList(false);
      setEditingIndex(null);
      setSearchTerm('');
      setSelectedValues({});
      setSelectedTagGroup(null);
      setInitialEditSelections({});
      setExpandedTagGroups([]);
      setExpandedModuleKeys({});
      // Scroll to configuration section
      setTimeout(() => {
        configSectionReference.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [selectedValues]);

  // Group configured TKVs by tag group
  const groupedTKVs = useMemo(() => {
    const groups: Record<string, ConfiguredTkv[]> = {};
    configuredTKVs.forEach((tkv: ConfiguredTkv) => {
      if (!groups[tkv.tagGroup]) {
        groups[tkv.tagGroup] = [];
      }
      groups[tkv.tagGroup].push(tkv);
    });
    return groups;
  }, [configuredTKVs]);

  // Filter configured TKVs based on search
  const filteredGroupedTKVs = useMemo(() => {
    if (!configSearchTerm) {
      return groupedTKVs;
    }

    const filtered: Record<string, ConfiguredTkv[]> = {};
    for (const tagGroupName of Object.keys(groupedTKVs)) {
      const configs = groupedTKVs[tagGroupName].filter((config) => {
        const label = config.keyValuePairs
          .map((p) => `[${p.key.name}: ${p.value.name}]`)
          .join(' ');
        return (
          label.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
          tagGroupName.toLowerCase().includes(configSearchTerm.toLowerCase())
        );
      });
      if (configs.length > 0) {
        filtered[tagGroupName] = configs;
      }
    }
    return filtered;
  }, [groupedTKVs, configSearchTerm]);

  // Sort values based on INITIAL selections when editing
  const sortedValues = useCallback(
    (
      tagGroupName: string,
      moduleKey: {values: Array<{id: number; name: string}>},
    ) => {
      if (
        editingIndex === null ||
        Object.keys(initialEditSelections).length === 0
      ) {
        return moduleKey.values;
      }

      // Sort values based on INITIAL selections (not current selections)
      return [
        ...moduleKey.values.filter(
          (v: {id: number}) => initialEditSelections[v.id],
        ),
        ...moduleKey.values.filter(
          (v: {id: number}) => !initialEditSelections[v.id],
        ),
      ];
    },
    [editingIndex, initialEditSelections],
  );

  const handleDeleteFiltered = useCallback(() => {
    // Collect all indices first to avoid issues with state updates during iteration
    const filteredTKVIndices: number[] = [];
    for (const tagGroupName of Object.keys(filteredGroupedTKVs)) {
      for (const config of filteredGroupedTKVs[tagGroupName]) {
        const tkvId = `${config.tagGroupId}_${config.keyValuePairs
          .map((p) => `${p.key.id}_${p.value.id}`)
          .sort()
          .join('_')}`;

        // Find the index of this TKV in the configuredTKVs array
        const index = configuredTKVs.findIndex((tkv) => {
          const id = `${tkv.tagGroupId}_${tkv.keyValuePairs
            .map((p) => `${p.key.id}_${p.value.id}`)
            .sort()
            .join('_')}`;
          return id === tkvId;
        });

        if (index !== -1) {
          filteredTKVIndices.push(index);
        }
      }
    }

    // Sort indices in descending order to delete from highest to lowest
    // This prevents index shifting issues
    filteredTKVIndices.sort((a, b) => b - a);

    // Delete each filtered TKV by index
    for (const index of filteredTKVIndices) {
      removeConfiguredTagKeyValue(moduleId, instanceId, index);
    }

    // Clear search after deletion
    // setConfigSearchTerm('');
  }, [
    filteredGroupedTKVs,
    configuredTKVs,
    removeConfiguredTagKeyValue,
    moduleId,
    instanceId,
  ]);

  // Show empty state if no available module tags
  if (!availableModuleTags) {
    return (
      <div className="flex items-center justify-center p-8">
        <div style={{color: 'var(--color-text-neutral-tertiary)'}}>
          No module tag keys available
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4">
      {/* Configured TKVs Summary with Tag Groups */}
      <div
        ref={configSectionReference}
        className="mb-2 overflow-hidden rounded-md border shadow-sm"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border-neutral-02)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 border-b px-1 py-1"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderColor: 'var(--color-border-neutral-02)',
          }}
        >
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
            <h2
              className="text-base font-semibold"
              style={{color: 'var(--color-text-neutral-primary)'}}
            >
              Configured TKVs
            </h2>
          </div>

          {/* Search Bar - Only visible when there are items */}
          {Object.keys(groupedTKVs).length > 0 && (
            <div className="m-0.5 flex-1">
              <ArcSearchBar
                onSearchChange={setConfigSearchTerm}
                placeholder="Search configured TKVs..."
                searchTerm={configSearchTerm}
              />
            </div>
          )}

          {/* Delete Filtered Button - Only visible when there are filtered results */}
          {configSearchTerm &&
            Object.keys(filteredGroupedTKVs).length > 0 &&
            isEditable && (
              <Button
                className="flex items-center gap-1.5"
                emphasis="danger"
                onClick={handleDeleteFiltered}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--color-surface-error-subtle)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                startIcon={Trash2}
                title={`Delete ${Object.values(filteredGroupedTKVs).flat().length} filtered TKV(s)`}
                variant="ghost"
              >
                Delete ({Object.values(filteredGroupedTKVs).flat().length})
              </Button>
            )}

          {isEditable && (
            <Button
              className="m-2 inline-flex items-center"
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

        {/* Tag Groups */}
        <div
          className={`transition-all duration-200 ease-in-out ${
            isConfigSectionCollapsed
              ? 'max-h-0 overflow-hidden'
              : 'max-h-[60vh] overflow-auto'
          }`}
        >
          <div className="p-4">
            {Object.keys(filteredGroupedTKVs).length === 0 ? (
              <div
                className="text-center"
                style={{color: 'var(--color-text-neutral-tertiary)'}}
              >
                {configSearchTerm ? (
                  <>
                    <div className="mb-2 text-2xl">🔍</div>
                    <p>No TKVs match your search</p>
                  </>
                ) : (
                  <p>No tags configured</p>
                )}
              </div>
            ) : (
              Object.keys(filteredGroupedTKVs).map((tagGroupName) => {
                const configs = filteredGroupedTKVs[tagGroupName];

                return (
                  <TagGroupSummary
                    key={tagGroupName}
                    configurations={configs}
                    hasActiveSearch={!!configSearchTerm}
                    isEditable={isEditable}
                    onDeleteItem={handleDeleteTKV}
                    onDeleteTagGroup={handleDeleteTagGroup}
                    onEditItem={handleEditTKV}
                    tagGroupName={tagGroupName}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* TKV Parameters Section */}
      <TkvParametersSection
        isEditable={isEditable}
        onParametersChange={(parameters_) => {
          // Update local state immediately for UI responsiveness
          setParameters(parameters_);
        }}
        parameters={parameters}
        visible={showSearchAndList}
      />

      {/* Search and List Section - Hidden by default */}
      {showSearchAndList && (
        <>
          {/* Search Bar with Expand/Collapse buttons */}
          <div ref={searchBarReference} className="mt-4 flex items-center gap-2">
            <div className="flex-1">
              <ArcSearchBar
                onSearchChange={setSearchTerm}
                placeholder="Search module tag keys or values..."
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

          {/* List Container */}
          <div
            className="mt-4 overflow-hidden rounded border shadow-sm"
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
                aria-label="Select all tag groups"
                checked={false}
                className="ml-3"
                disabled={!isEditable}
                onChange={() => {}}
                size="sm"
                style={{visibility: 'hidden'}}
              />
              <button
                className="ml-3 flex w-32 cursor-pointer select-none items-center gap-1 hover:text-blue"
                onClick={() => handleSort('id')}
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                <span>Tag ID</span>
                {getSortIcon('id')}
              </button>
              <button
                className="ml-3 flex flex-1 cursor-pointer select-none items-center gap-1 text-left hover:text-blue"
                onClick={() => handleSort('name')}
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                <span>Tag</span>
                {getSortIcon('name')}
              </button>
            </div>

            {/* Tag Groups List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredAndSortedTagGroups.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12"
                  style={{color: 'var(--color-text-neutral-tertiary)'}}
                >
                  <div className="mb-3 text-4xl">🔍</div>
                  <p>No module tag keys or values match your search</p>
                </div>
              ) : (
                filteredAndSortedTagGroups.map((tagGroupName) => {
                  const tagGroup = availableModuleTagsInfo[tagGroupName];
                  const isExpanded = expandedTagGroups.includes(tagGroup.id);
                  const isSelected = selectedTagGroup === tagGroup.id;

                  return (
                    <div
                      key={tagGroupName}
                      className="border-b last:border-b-0"
                      style={{borderColor: 'var(--color-border-neutral-02)'}}
                    >
                      {/* Tag Group Header */}
                      <div
                        className="flex cursor-pointer items-center px-3 py-2.5 transition-colors"
                        onClick={() => toggleTagGroupExpansion(tagGroup.id)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              'var(--color-surface-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }
                        }}
                        style={{
                          backgroundColor: isSelected
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
                          checked={isSelected}
                          className="ml-3 h-4 w-4 cursor-pointer"
                          disabled={!isEditable}
                          name="tag-group"
                          onChange={() => setSelectedTagGroup(tagGroup.id)}
                          onClick={(e) => e.stopPropagation()}
                          type="radio"
                        />
                        <div
                          className="ml-3 w-32 font-mono text-sm"
                          style={{color: 'var(--color-text-neutral-secondary)'}}
                        >
                          {ConvertNumberToHexString(tagGroup.id) || tagGroup.id}
                        </div>
                        <div
                          className="ml-3 flex-1 text-sm font-medium"
                          style={{color: 'var(--color-text-neutral-primary)'}}
                        >
                          {tagGroupName}
                        </div>
                      </div>

                      {/* Module Keys Container */}
                      {isExpanded && (
                        <div
                          style={{
                            backgroundColor: 'var(--color-surface-primary)',
                          }}
                        >
                          {Object.keys(tagGroup.keys).map((moduleKeyName) => {
                            const moduleKey = tagGroup.keys[moduleKeyName];
                            const isModuleKeyExpanded = expandedModuleKeys[moduleKey.id];
                            const allValuesSelected = moduleKey.values.every(
                              (v: {id: number}) => selectedValues[v.id],
                            );
                            const someValuesSelected = moduleKey.values.some(
                              (v: {id: number}) => selectedValues[v.id],
                            );

                            return (
                              <div key={moduleKeyName}>
                                {/* Module Key Header */}
                                <div
                                  className="flex cursor-pointer items-center border-b px-3 py-2 pl-16 transition-colors"
                                  onClick={() =>
                                    toggleModuleKeyExpansion(moduleKey.id)
                                  }
                                  onMouseEnter={(e) => {
                                    if (!allValuesSelected) {
                                      e.currentTarget.style.backgroundColor =
                                        'var(--color-surface-tertiary)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!allValuesSelected) {
                                      e.currentTarget.style.backgroundColor =
                                        'var(--color-surface-secondary)';
                                    }
                                  }}
                                  style={{
                                    backgroundColor: allValuesSelected
                                      ? 'var(--color-surface-info-subtle)'
                                      : 'var(--color-surface-secondary)',
                                    borderColor:
                                      'var(--color-border-neutral-02)',
                                  }}
                                >
                                  <span
                                    className="w-3"
                                    style={{
                                      color:
                                        'var(--color-text-neutral-secondary)',
                                    }}
                                  >
                                    {isModuleKeyExpanded ? (
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
                                      toggleModuleKeySelection(
                                        tagGroup.id,
                                        moduleKey.id,
                                      );
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    type="checkbox"
                                  />
                                  <span
                                    className="ml-3 mr-2 w-32 font-mono text-sm"
                                    style={{
                                      color:
                                        'var(--color-text-neutral-primary)',
                                    }}
                                  >
                                    {ConvertNumberToHexString(moduleKey.id) ||
                                      moduleKey.id}
                                  </span>
                                  <span
                                    className="text-sm font-medium"
                                    style={{
                                      color:
                                        'var(--color-text-neutral-primary)',
                                    }}
                                  >
                                    {moduleKeyName}
                                  </span>
                                </div>

                                {/* Values */}
                                {isModuleKeyExpanded && (
                                  <div>
                                    {sortedValues(tagGroupName, moduleKey).map(
                                      (value: {id: number; name: string}) => (
                                        <div
                                          key={value.id}
                                          className="flex items-center gap-3 border-t px-3 py-2 pl-[88px] transition-colors"
                                          style={{
                                            backgroundColor: selectedValues[
                                              value.id
                                            ]
                                              ? 'var(--color-surface-info-subtle)'
                                              : 'transparent',
                                            borderColor:
                                              'var(--color-border-neutral-03)',
                                          }}
                                        >
                                          <Checkbox
                                            aria-label="Value Checkbox"
                                            checked={
                                              selectedValues[value.id] || false
                                            }
                                            disabled={!isEditable}
                                            onChange={(e) =>
                                              toggleValueSelection(
                                                value.id,
                                                tagGroup.id,
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
                                            {ConvertNumberToHexString(
                                              value.id,
                                            ) || value.id}
                                          </div>
                                          <div
                                            className="flex-1 text-sm"
                                            style={{
                                              color:
                                                'var(--color-text-neutral-primary)',
                                            }}
                                          >
                                            {value.name}
                                          </div>
                                        </div>
                                      ),
                                    )}
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

          {/* Footer Buttons */}
          {isEditable && (
            <div className="mt-4 flex justify-end gap-2">
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
        </>
      )}
    </div>
  );
}
