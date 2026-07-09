/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from 'react';

import {TextInput} from '@qualcomm-ui/react/text-input';

export interface HexInputControlProps {
  currentValue: string;
  disabled: boolean;
  elementKey: string;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
}

export function HexInputControl({
  currentValue,
  disabled,
  elementKey: key,
  onAutoCommit,
  onValueChange,
}: HexInputControlProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return (
    <TextInput
      aria-label={key}
      className="w-32"
      clearable={false}
      defaultValue={currentValue}
      disabled={disabled}
      onFocusChange={(focused) => {
        if (!focused) {
          onAutoCommit?.();
        }
      }}
      onValueChange={(value) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => onValueChange(key, value), 100);
      }}
      size="sm"
    />
  );
}
