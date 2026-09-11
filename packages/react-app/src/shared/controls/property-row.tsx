/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {selectCollection} from '@qualcomm-ui/core/select';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {Select} from '@qualcomm-ui/react/select';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Portal} from '@qualcomm-ui/react-core/portal';

export type PropertyValue = number | string;

export interface PropertyOption {
  label: string;
  value: string;
}

export interface PropertyRowProps {
  error?: string | null;
  isEditing: boolean;
  isSaving?: boolean;
  label: string;
  mode: 'number' | 'select' | 'text';
  onChange: (value: PropertyValue) => void;
  options?: PropertyOption[];
  readOnly?: boolean;
  value: PropertyValue;
}

export function PropertyRow({
  error,
  isEditing,
  isSaving,
  label,
  mode,
  onChange,
  options = [],
  readOnly,
  value,
}: PropertyRowProps) {
  const disabled = !isEditing || readOnly === true;

  return (
    <div className="grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] items-start gap-3 py-1">
      <span className="pt-1 text-sm font-medium">{label}</span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <PropertyRowControl
              disabled={disabled}
              label={label}
              mode={mode}
              onChange={onChange}
              options={options}
              value={value}
            />
          </div>
          {isSaving === true && <ProgressRing size="xxs" />}
        </div>
        {error ? (
          <div
            className="mt-1 text-xs text-[var(--color-foreground-status-error)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface PropertyRowControlProps {
  disabled: boolean;
  label: string;
  mode: 'number' | 'select' | 'text';
  onChange: (value: PropertyValue) => void;
  options: PropertyOption[];
  value: PropertyValue;
}

function PropertyRowControl({
  disabled,
  label,
  mode,
  onChange,
  options,
  value,
}: PropertyRowControlProps) {
  if (mode === 'select') {
    return (
      <PropertyRowSelect
        disabled={disabled}
        label={label}
        onChange={(nextValue) => onChange(nextValue)}
        options={options}
        value={String(value)}
      />
    );
  }

  return (
    <TextInput
      aria-label={label}
      clearable={false}
      inputProps={{type: mode === 'number' ? 'number' : 'text'}}
      onValueChange={(nextValue) => {
        onChange(mode === 'number' ? Number(nextValue) : nextValue);
      }}
      readOnly={disabled}
      size="sm"
      value={String(value)}
    />
  );
}

interface PropertyRowSelectProps {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: PropertyOption[];
  value: string;
}

function PropertyRowSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: PropertyRowSelectProps) {
  const collection = selectCollection({
    itemLabel: (item: PropertyOption) => item.label,
    items: options,
    itemValue: (item: PropertyOption) => item.value,
  });

  return (
    <Select.Root
      aria-label={label}
      collection={collection}
      disabled={disabled}
      onValueChange={(valueStrings: string[]) => {
        const [nextValue] = valueStrings;
        if (typeof nextValue === 'string') {
          onChange(nextValue);
        }
      }}
      positioning={{sameWidth: true}}
      size="sm"
      value={value ? [value] : []}
    >
      <Select.Label className="sr-only">{label}</Select.Label>
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
