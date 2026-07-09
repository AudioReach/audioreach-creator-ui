/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {selectCollection} from '@qualcomm-ui/core/select';
import {Select} from '@qualcomm-ui/react/select';

import type {NameValuePairDto} from '~entities/spf-module-data';

import {findOptionName} from '../../lib/find-option-name';

export interface SelectControlProps {
  currentValue: string;
  disabled: boolean;
  elementKey: string;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
  options: NameValuePairDto[];
}

export function SelectControl({
  currentValue,
  disabled,
  elementKey: key,
  onAutoCommit,
  onValueChange,
  options,
}: SelectControlProps) {
  const selectedName = findOptionName(options, currentValue);
  const [selected, setSelected] = useState(selectedName);
  const names = options.map((o) => o.name);
  const collection = selectCollection({items: names});
  const longestName = names.reduce((a, b) => (a.length > b.length ? a : b), '');
  const hexDisplay = options.find((o) => o.name === selected)?.value ?? '';

  return (
    <div className="flex items-center">
      <Select
        aria-label={key}
        clearable={false}
        collection={collection}
        disabled={disabled}
        onValueChange={(details) => {
          const newName = details[0];
          if (!newName) {
            return;
          }
          setSelected(newName);
          const newHex =
            options.find((o) => o.name === newName)?.value ?? currentValue;
          onValueChange(key, newHex);
          onAutoCommit?.();
        }}
        positionerProps={{className: 'min-w-max'}}
        size="sm"
        style={{minWidth: `calc(${longestName.length}ch + 3rem)`}}
        value={[selected]}
        valueTextProps={{className: 'whitespace-nowrap'}}
      />
      {hexDisplay && (
        <span className="ml-4 font-mono text-sm">{hexDisplay}</span>
      )}
    </div>
  );
}
