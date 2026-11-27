/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Select} from '@qualcomm-ui/react/select';
import {Portal} from '@qualcomm-ui/react-core/portal';
import type {
  CollectionItem,
  ListCollection,
} from '@qualcomm-ui/utils/collection';

interface IndexSelectProps<T extends CollectionItem> {
  collection: ListCollection<T>;
  label: string;
  onValueChange: (value: string) => void;
  value: string | undefined;
}

export function IndexSelect<T extends CollectionItem>(
  props: IndexSelectProps<T>,
) {
  const {collection, label, onValueChange, value} = props;

  return (
    <Select.Root
      className="w-fit p-2"
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
      <div className="flex items-center gap-2">
        <Select.Label className="shrink-0">{label}</Select.Label>
        <Select.Control>
          <Select.ValueText />
          <Select.Indicator />
        </Select.Control>
      </div>
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
