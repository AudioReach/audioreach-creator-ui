/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef, useState} from 'react';

import {TextInput} from '@qualcomm-ui/react/text-input';

import {
  formatNumericValue,
  normalizeNumericValue,
} from '../../lib/format-numeric-value';
import {parseHexOrDec} from '../../lib/parse-hex-or-dec';

export interface QFormatControlProps {
  currentValue: string;
  dataType?: string;
  disabled: boolean;
  elementKey: string;
  invalid?: boolean;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
  precision?: number;
  qFormatN: number;
}

export function QFormatControl({
  currentValue,
  dataType,
  disabled,
  elementKey: key,
  invalid = false,
  onAutoCommit,
  onValueChange,
  precision = 5,
  qFormatN,
}: QFormatControlProps) {
  const [hexVal, setHexVal] = useState(
    formatNumericValue(currentValue, dataType),
  );
  const [decVal, setDecVal] = useState(
    (
      parseHexOrDec(normalizeNumericValue(currentValue, dataType)) /
      Math.pow(2, qFormatN)
    ).toFixed(precision),
  );
  const hexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);

  const flushPendingValue = (): void => {
    const pendingValue = pendingValueRef.current;
    if (pendingValue === null) {
      return;
    }
    if (hexTimerRef.current) {
      clearTimeout(hexTimerRef.current);
      hexTimerRef.current = null;
    }
    if (decTimerRef.current) {
      clearTimeout(decTimerRef.current);
      decTimerRef.current = null;
    }
    pendingValueRef.current = null;
    onValueChange(key, pendingValue);
  };

  useEffect(
    () => () => {
      if (hexTimerRef.current) {
        clearTimeout(hexTimerRef.current);
      }
      if (decTimerRef.current) {
        clearTimeout(decTimerRef.current);
      }
    },
    [],
  );

  return (
    <div className="flex items-center gap-2">
      <TextInput
        aria-label={`${key} hex`}
        className="w-28"
        clearable={false}
        disabled={disabled}
        invalid={invalid}
        onFocusChange={(focused) => {
          if (!focused) {
            flushPendingValue();
            onAutoCommit?.();
          }
        }}
        onValueChange={(value) => {
          setHexVal(value);
          const num = parseHexOrDec(normalizeNumericValue(value, dataType));
          if (!isNaN(num)) {
            setDecVal((num / Math.pow(2, qFormatN)).toFixed(precision));
          }
          if (hexTimerRef.current) {
            clearTimeout(hexTimerRef.current);
          }
          pendingValueRef.current = value;
          hexTimerRef.current = setTimeout(() => {
            pendingValueRef.current = null;
            hexTimerRef.current = null;
            onValueChange(key, value);
          }, 100);
        }}
        size="sm"
        value={hexVal}
      />
      <TextInput
        aria-label={`${key} dec`}
        className="w-24"
        clearable={false}
        disabled={disabled}
        invalid={invalid}
        onFocusChange={(focused) => {
          if (!focused) {
            flushPendingValue();
            onAutoCommit?.();
          }
        }}
        onValueChange={(value) => {
          setDecVal(value);
          const num = parseHexOrDec(value, 'Double');
          let nextValue = value;
          if (!Number.isNaN(num)) {
            nextValue = formatNumericValue(
              String(Math.round(num * Math.pow(2, qFormatN))),
              dataType,
            );
            setHexVal(nextValue);
          }
          if (decTimerRef.current) {
            clearTimeout(decTimerRef.current);
          }
          pendingValueRef.current = nextValue;
          decTimerRef.current = setTimeout(() => {
            pendingValueRef.current = null;
            decTimerRef.current = null;
            onValueChange(key, nextValue);
          }, 100);
        }}
        size="sm"
        value={decVal}
      />
    </div>
  );
}
