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
  const pendingValueRef = useRef<string | null>(null);

  const flushPendingValue = (): void => {
    const pendingValue = pendingValueRef.current;
    if (pendingValue === null) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingValueRef.current = null;
    onValueChange(key, pendingValue);
  };

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
          flushPendingValue();
          onAutoCommit?.();
        }
      }}
      onValueChange={(value) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        pendingValueRef.current = value;
        timerRef.current = setTimeout(() => {
          pendingValueRef.current = null;
          timerRef.current = null;
          onValueChange(key, value);
        }, 100);
      }}
      size="sm"
    />
  );
}
