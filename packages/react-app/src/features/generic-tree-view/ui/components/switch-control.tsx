/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {Switch} from '@qualcomm-ui/react/switch';

export interface SwitchControlProps {
  currentValue: string;
  disabled: boolean;
  elementKey: string;
  offValue: string;
  onAutoCommit?: () => void;
  onValue: string;
  onValueChange: (key: string, value: string) => void;
}

export function SwitchControl({
  currentValue,
  disabled,
  elementKey: key,
  offValue,
  onAutoCommit,
  onValue,
  onValueChange,
}: SwitchControlProps) {
  const [checked, setChecked] = useState(currentValue === onValue);
  useEffect(() => {
    setChecked(currentValue === onValue);
  }, [currentValue, onValue]);
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Switch
        aria-label={key}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(isChecked) => {
          setChecked(isChecked);
          onValueChange(key, isChecked ? onValue : offValue);
          onAutoCommit?.();
        }}
        size="sm"
      />
    </div>
  );
}
