/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from 'react';

import {TextInput} from '@qualcomm-ui/react/text-input';

import {formatNumericValue} from '../../lib/format-numeric-value';

export interface HexInputControlProps {
  currentValue: string;
  dataType?: string;
  disabled: boolean;
  elementKey: string;
  invalid?: boolean;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
}

export function HexInputControl({
  currentValue,
  dataType,
  disabled,
  elementKey: key,
  invalid = false,
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
      defaultValue={formatNumericValue(currentValue, dataType)}
      disabled={disabled}
      invalid={invalid}
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
