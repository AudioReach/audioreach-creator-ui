/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';

import type {KeyDefinitionResponseDto} from '~entities/key-definitions';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

/**
 * Renders definition-backed choices for the temporary Add candidate.
 * Parent-owned state keeps checkbox/radio actions synchronized with Editor text.
 */
/** Controlled Selection Panel contract for the Add KV Vector candidate. */
interface AddKvVectorSelectionPanelProps {
  definitions: KeyDefinitionResponseDto[];
  expandedKeySystemIds?: string[];
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  onExpandedKeySystemIdsChange?: (keySystemIds: string[]) => void;
  onSelectionChange: (
    selectedKeySystemIds: string[],
    selectedValueSystemIdsByKey: Record<string, string>,
  ) => void;
  selectedKeySystemIds: string[];
  selectedValueSystemIdsByKey: Record<string, string>;
}

type SortColumn = 'id' | 'name';
type SortOrder = 'asc' | 'desc';

function compareBySort(
  first: {name: string; naturalId: number;},
  second: {name: string; naturalId: number;},
  column: SortColumn,
  order: SortOrder,
): number {
  const comparison =
    column === 'id'
      ? first.naturalId - second.naturalId
      : first.name.localeCompare(second.name);
  return order === 'asc' ? comparison : -comparison;
}

/** Presents definition-backed key/value choices for the current Add candidate. */
export function AddKvVectorSelectionPanel({
  definitions,
  expandedKeySystemIds: controlledExpandedKeySystemIds,
  onCollapseAll,
  onExpandAll,
  onExpandedKeySystemIdsChange,
  onSelectionChange,
  selectedKeySystemIds,
  selectedValueSystemIdsByKey,
}: AddKvVectorSelectionPanelProps) {
  const [
    uncontrolledExpandedKeySystemIds,
    setUncontrolledExpandedKeySystemIds,
  ] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const expandedKeySystemIds =
    controlledExpandedKeySystemIds ?? uncontrolledExpandedKeySystemIds;
  const updateExpandedKeySystemIds = (keySystemIds: string[]): void => {
    // Support standalone use while letting the parent preserve Add-panel state.
    if (onExpandedKeySystemIdsChange) {
      onExpandedKeySystemIdsChange(keySystemIds);
      return;
    }
    setUncontrolledExpandedKeySystemIds(keySystemIds);
  };

  const sortedKeys = useMemo(
    () =>
      definitions.toSorted((first, second) =>
        compareBySort(first, second, sortColumn, sortOrder),
      ),
    [definitions, sortColumn, sortOrder],
  );

  const clearSelectedKey = (keySystemId: string): void => {
    // A key has no meaningful standalone selection; clear its paired value too.
    const selectedKeys = selectedKeySystemIds.filter(
      (id) => id !== keySystemId,
    );
    const selectedValues = {...selectedValueSystemIdsByKey};
    delete selectedValues[keySystemId];
    onSelectionChange(selectedKeys, selectedValues);
  };

  const selectValue = (keySystemId: string, valueSystemId: string): void => {
    // A later radio choice replaces the one allowed value for this key.
    const selectedKeys = selectedKeySystemIds.includes(keySystemId)
      ? selectedKeySystemIds
      : [...selectedKeySystemIds, keySystemId];
    onSelectionChange(selectedKeys, {
      ...selectedValueSystemIdsByKey,
      [keySystemId]: valueSystemId,
    });
  };

  const toggleKeyExpansion = (keySystemId: string): void => {
    updateExpandedKeySystemIds(
      expandedKeySystemIds.includes(keySystemId)
        ? expandedKeySystemIds.filter((id) => id !== keySystemId)
        : [...expandedKeySystemIds, keySystemId],
    );
  };

  const handleSort = (column: SortColumn): void => {
    if (sortColumn === column) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortOrder('asc');
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

  return (
    <div className="min-h-0 w-full">
      <div className="bg-primary border-neutral-02 max-h-80 w-full overflow-y-auto rounded border shadow-sm">
        <div className="bg-secondary border-neutral-02 text-neutral-primary sticky top-0 z-10 grid grid-cols-[1.75rem_1.75rem_6.5rem_minmax(0,1fr)_auto] items-center gap-1 border-b px-1.5 py-1 text-sm font-semibold">
          <span />
          <span />
          <Button
            className="text-neutral-primary flex w-full items-center justify-start gap-1 px-0 text-left"
            onClick={() => handleSort('id')}
            size="sm"
            title="Sort by key ID"
            type="button"
            variant="ghost"
          >
            Key ID
            {getSortIcon('id')}
          </Button>
          <Button
            className="text-neutral-primary flex w-full items-center justify-start gap-1 px-0 text-left"
            onClick={() => handleSort('name')}
            size="sm"
            title="Sort by key name"
            type="button"
            variant="ghost"
          >
            Key Name
            {getSortIcon('name')}
          </Button>
          <div className="flex items-center gap-1">
            {onExpandAll && (
              <IconButton
                aria-label="Expand all"
                icon={<ChevronsDown />}
                onClick={onExpandAll}
                size="sm"
                title="Expand all keys"
                variant="ghost"
              />
            )}
            {onCollapseAll && (
              <IconButton
                aria-label="Collapse all"
                icon={<ChevronsUp />}
                onClick={onCollapseAll}
                size="sm"
                title="Collapse all keys"
                variant="ghost"
              />
            )}
          </div>
        </div>
        {sortedKeys.map((key) => {
          const isExpanded = expandedKeySystemIds.includes(key.systemId);
          const hasSelectedValue =
            selectedValueSystemIdsByKey[key.systemId] !== undefined;
          return (
            <div
              key={key.systemId}
              className="border-neutral-01 border-b last:border-b-0"
            >
              <div
                className="border-neutral-01 hover:bg-secondary grid cursor-pointer grid-cols-[1.75rem_1.75rem_6.5rem_minmax(0,1fr)] items-center gap-1 bg-transparent px-1.5 py-1 transition-colors"
                onClick={() => toggleKeyExpansion(key.systemId)}
              >
                <IconButton
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${key.name}`}
                  icon={isExpanded ? <ChevronDown /> : <ChevronRight />}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleKeyExpansion(key.systemId);
                  }}
                  size="sm"
                  title={`${isExpanded ? 'Collapse' : 'Expand'} ${key.name}`}
                  variant="ghost"
                />
                {/* No key-only selection; this checkbox only removes its pair. */}
                <Checkbox
                  aria-label={`Select ${key.name}`}
                  checked={hasSelectedValue}
                  disabled={!hasSelectedValue}
                  onCheckedChange={() => clearSelectedKey(key.systemId)}
                  onClick={(event) => event.stopPropagation()}
                  size="sm"
                />
                <span className="text-neutral-secondary truncate font-mono text-sm">
                  {ConvertNumberToHexString(key.naturalId) ?? key.naturalId}
                </span>
                <span className="text-neutral-primary min-w-0 truncate text-sm font-medium">
                  {key.name}
                </span>
              </div>
              {isExpanded && (
                <RadioGroup
                  className="bg-primary m-0 w-full gap-0 border-0 p-0 [&>*]:!m-0 [&>*]:!p-0"
                  onValueChange={(value) => {
                    if (value) {
                      selectValue(key.systemId, value);
                    }
                  }}
                  size="sm"
                  value={selectedValueSystemIdsByKey[key.systemId] ?? ''}
                >
                  {key.values
                    .toSorted((first, second) =>
                      compareBySort(first, second, sortColumn, sortOrder),
                    )
                    .map((value) => {
                      return (
                        <div
                          key={value.systemId}
                          className="border-neutral-01 hover:bg-secondary grid grid-cols-[1.75rem_6.5rem_minmax(0,1fr)] items-center gap-1 border-t bg-transparent px-1.5 py-1 pl-14 transition-colors"
                        >
                          <Radio
                            aria-label={`Select ${value.name}`}
                            value={value.systemId}
                          />
                          <span className="text-neutral-secondary truncate font-mono text-sm">
                            {ConvertNumberToHexString(value.naturalId) ??
                              value.naturalId}
                          </span>
                          <span className="text-neutral-primary min-w-0 truncate text-sm">
                            {value.name}
                          </span>
                        </div>
                      );
                    })}
                </RadioGroup>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
