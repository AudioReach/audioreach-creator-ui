/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from 'react';

import {Accordion} from '@qualcomm-ui/react/accordion';
import {Badge, StatusBadge} from '@qualcomm-ui/react/badge';

import {NO_MATCH_MESSAGE} from '../../lib/messages';
import type {TreeViewItem} from '../../model/tree-view-data';

import {ElementTree} from './element-tree';

interface ParameterDetailPaneProps {
  arrayCounts: Map<string, number>;
  committedValues: Map<string, string>;
  dirtyItemIds: Set<string>;
  dirtyPaths: Set<string>;
  elementValues: Map<string, string>;
  expandAll?: boolean;
  expandedIds: string[];
  invalidPaths: Set<string>;
  matchSets: {elementIds: Set<string>; paramIds: Set<string>} | null;
  onAutoCommit?: () => void;
  onExpandedChange: (ids: string[]) => void;
  onValueChange: (key: string, value: string) => void;
  policyFilter: Set<'BASIC' | 'ADVANCED'>;
  readOnly: boolean;
  resetKey: number;
  searchActive?: boolean;
  selectedItems: TreeViewItem[];
  setItemIds: Set<string>;
  setPaths: Set<string>;
  showBadges: boolean;
  showRanges: boolean;
}

const POLICY_EMPHASIS: Record<
  string,
  'brand' | 'danger' | 'info' | 'neutral' | 'success' | 'warning'
> = {
  CALIBRATION: 'neutral',
  RTC: 'danger',
  RTC_READONLY: 'warning',
  RTM: 'info',
};

const POLICY_LABEL: Record<string, string> = {
  CALIBRATION: 'Calibration',
  RTC_READONLY: 'RTC Readonly',
};

function ItemTriggerContent({
  isDirty,
  isSet,
  item,
  showBadges,
}: {
  isDirty: boolean;
  isSet: boolean;
  item: TreeViewItem;
  showBadges: boolean;
}) {
  const hasBadges =
    showBadges &&
    ((item.toolPolicy?.length ?? 0) > 0 ||
      item.isNeuralNet ||
      item.isOffloaded ||
      item.isReadOnly ||
      item.deprecated);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-0.5">
      <span className="flex w-3 shrink-0 items-center">
        {isDirty && (
          <StatusBadge className="dirty-pulse" emphasis="warning" size="sm" />
        )}
        {!isDirty && isSet && <StatusBadge emphasis="success" size="sm" />}
      </span>

      <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>

      {hasBadges && (
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">
          {item.toolPolicy?.map((p) => (
            <Badge
              key={p}
              emphasis={POLICY_EMPHASIS[p] ?? 'neutral'}
              size="sm"
              variant="subtle"
            >
              {POLICY_LABEL[p] ?? p}
            </Badge>
          ))}
          {item.isNeuralNet && (
            <Badge emphasis="brand" size="sm" variant="subtle">
              Neural Net
            </Badge>
          )}
          {item.isOffloaded && (
            <Badge emphasis="neutral" size="sm" variant="subtle">
              Offloaded
            </Badge>
          )}
          {item.isReadOnly && (
            <Badge emphasis="neutral" size="sm" variant="subtle">
              Read Only
            </Badge>
          )}
          {item.deprecated && (
            <Badge emphasis="warning" size="sm" variant="subtle">
              Deprecated
            </Badge>
          )}
        </span>
      )}
    </div>
  );
}

export function ParameterDetailPane({
  arrayCounts,
  committedValues,
  dirtyItemIds,
  dirtyPaths,
  elementValues,
  expandAll,
  expandedIds,
  invalidPaths,
  matchSets,
  onAutoCommit,
  onExpandedChange,
  onValueChange,
  policyFilter,
  readOnly,
  resetKey,
  searchActive,
  selectedItems,
  setItemIds,
  setPaths,
  showBadges,
  showRanges,
}: ParameterDetailPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevItemIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const prevIds = prevItemIdsRef.current;
    const currentIds = selectedItems.map((p) => p.id);
    const newId = currentIds.find((id) => !prevIds.includes(id));
    prevItemIdsRef.current = currentIds;

    if (!newId || !scrollRef.current) {
      return;
    }
    const el = scrollRef.current.querySelector(`[data-item-id="${newId}"]`);
    el?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [selectedItems]);

  if (selectedItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-neutral-secondary text-sm">
          {searchActive
            ? NO_MATCH_MESSAGE
            : 'Select a parameter from the left panel.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {selectedItems.length > 1 && (
        <div className="text-neutral-secondary bg-neutral-01 flex shrink-0 items-center gap-2 border-b px-4 py-2.5 text-xs">
          <span>{selectedItems.length} parameters selected</span>
          <span className="opacity-30">·</span>
          <span>Ctrl+click to add/remove</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
        <Accordion.Root
          className="flex flex-col gap-1"
          collapsible
          multiple
          onValueChange={onExpandedChange}
          value={expandedIds}
        >
          {selectedItems.map((item) => {
            const isDirty = dirtyItemIds.has(item.id);
            const isSet = setItemIds.has(item.id);
            return (
              <div
                key={item.id}
                className="bg-primary overflow-hidden rounded-md border shadow-sm"
                data-item-id={item.id}
              >
                <Accordion.ItemRoot value={item.id}>
                  <Accordion.ItemTrigger>
                    <ItemTriggerContent
                      isDirty={isDirty}
                      isSet={isSet}
                      item={item}
                      showBadges={showBadges}
                    />
                    <Accordion.ItemIndicator />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    {expandedIds.includes(item.id) && (
                      <ElementTree
                        arrayCounts={arrayCounts}
                        committedValues={committedValues}
                        dirtyPaths={dirtyPaths}
                        elementValues={elementValues}
                        expandAll={expandAll}
                        invalidPaths={invalidPaths}
                        item={item}
                        matchSets={matchSets}
                        onAutoCommit={onAutoCommit}
                        onValueChange={onValueChange}
                        paramReadOnly={readOnly || (item.isReadOnly ?? false)}
                        policyFilter={policyFilter}
                        resetKey={resetKey}
                        setPaths={setPaths}
                        showRanges={showRanges}
                      />
                    )}
                  </Accordion.ItemContent>
                </Accordion.ItemRoot>
              </div>
            );
          })}
        </Accordion.Root>
      </div>
    </div>
  );
}
