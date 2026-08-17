/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo} from 'react';

import {selectCollection} from '@qualcomm-ui/core/select';
import {Select} from '@qualcomm-ui/react/select';
import {Portal} from '@qualcomm-ui/react-core/portal';

import {useGraphDesignerStoreShallow} from '~features/graph-designer';

import {aggregateSubgraphCkvKeys} from '../../lib/aggregate-subgraph-ckv-keys';

const NA_SENTINEL = 'NA';

interface SubgraphHeaderProps {
  subgraphId: string;
}

export function SubgraphHeader({subgraphId}: SubgraphHeaderProps) {
  const {
    headerSelection,
    initializeHeaderSelection,
    moduleInstances,
    setHeaderKeyValue,
  } = useGraphDesignerStoreShallow((state) => ({
    headerSelection: state.headerSelectionsBySubgraphId[subgraphId],
    initializeHeaderSelection: state.initializeHeaderSelection,
    moduleInstances: state.graphData?.moduleInstances ?? {},
    setHeaderKeyValue: state.setHeaderKeyValue,
  }));

  const subgraphModules = useMemo(
    () =>
      Object.values(moduleInstances).filter(
        (module) => module.subgraphId === subgraphId,
      ),
    [moduleInstances, subgraphId],
  );

  const {isDependent, keyLabels, keyValues, valueLabels} = useMemo(
    () => aggregateSubgraphCkvKeys(subgraphModules),
    [subgraphModules],
  );
  const keys = useMemo(() => Object.keys(keyValues).sort(), [keyValues]);

  useEffect(() => {
    if (keys.length === 0) {
      return;
    }
    const defaults: Record<string, string> = {};
    for (const key of keys) {
      const [firstValue] = [...keyValues[key]].sort();
      defaults[key] = firstValue!;
    }
    initializeHeaderSelection(subgraphId, defaults);
    // Mount-only: defaults are seeded once per subgraph and never re-derived
    // from a later keyValues recompute (design.md §21.1 "Default selection
    // at mount").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subgraphId]);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div
      className="nodrag nopan flex items-center gap-2"
      data-testid="subgraph-header"
    >
      {keys.map((key) => (
        <KeySelect
          key={key}
          isDependent={isDependent}
          keyLabel={keyLabels[key] ?? key}
          onValueChange={(value) => setHeaderKeyValue(subgraphId, key, value)}
          value={headerSelection?.keyValues[key]}
          valueLabels={valueLabels[key] ?? {}}
          values={keyValues[key]}
        />
      ))}
    </div>
  );
}

interface KeySelectProps {
  isDependent: boolean;
  keyLabel: string;
  onValueChange: (value: string) => void;
  value: string | undefined;
  valueLabels: Record<string, string>;
  values: string[];
}

function KeySelect({
  isDependent,
  keyLabel,
  onValueChange,
  value,
  valueLabels,
  values,
}: KeySelectProps) {
  const options = useMemo(() => {
    const sorted = [...values].sort();
    return isDependent ? [...sorted, NA_SENTINEL] : sorted;
  }, [isDependent, values]);

  const collection = useMemo(
    () =>
      selectCollection({
        itemLabel: (item: string) =>
          item === NA_SENTINEL ? NA_SENTINEL : (valueLabels[item] ?? item),
        items: options,
        itemValue: (item: string) => item,
      }),
    [options, valueLabels],
  );

  return (
    <Select.Root
      className="w-fit"
      collection={collection}
      onValueChange={(valueStrings: string[]) => {
        const [newValue] = valueStrings;
        if (newValue) {
          onValueChange(newValue);
        }
      }}
      positioning={{sameWidth: false}}
      size="sm"
      value={value ? [value] : []}
    >
      <Select.Label className="shrink-0">{keyLabel}</Select.Label>
      <Select.Control>
        <Select.ValueText />
        <Select.Indicator />
      </Select.Control>
      <Select.HiddenSelect />
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => {
              const itemValue = collection.getItemValue(item);
              return (
                <Select.Item key={itemValue} item={item}>
                  <Select.ItemText>
                    {collection.stringifyItem(item)}
                  </Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              );
            })}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}
