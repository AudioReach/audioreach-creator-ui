/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef, useState} from 'react';

import {TextInput} from '@qualcomm-ui/react/text-input';

import {parseHexOrDec} from '../../lib/parse-hex-or-dec';

export interface QFormatControlProps {
  currentValue: string;
  disabled: boolean;
  elementKey: string;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
  qFormatN: number;
}

export function QFormatControl({
  currentValue,
  disabled,
  elementKey: key,
  onAutoCommit,
  onValueChange,
  qFormatN,
}: QFormatControlProps) {
  const [hexVal, setHexVal] = useState(currentValue);
  const [decVal, setDecVal] = useState(
    (parseHexOrDec(currentValue) / Math.pow(2, qFormatN)).toFixed(3),
  );
  const hexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        onFocusChange={(focused) => {
          if (!focused) {
            onAutoCommit?.();
          }
        }}
        onValueChange={(value) => {
          setHexVal(value);
          const num = parseHexOrDec(value);
          if (!isNaN(num)) {
            setDecVal((num / Math.pow(2, qFormatN)).toFixed(3));
          }
          if (hexTimerRef.current) {
            clearTimeout(hexTimerRef.current);
          }
          hexTimerRef.current = setTimeout(
            () => onValueChange(key, value),
            100,
          );
        }}
        size="sm"
        value={hexVal}
      />
      <TextInput
        aria-label={`${key} dec`}
        className="w-24"
        clearable={false}
        disabled={disabled}
        onFocusChange={(focused) => {
          if (!focused) {
            onAutoCommit?.();
          }
        }}
        onValueChange={(value) => {
          setDecVal(value);
          const num = parseFloat(value);
          if (!isNaN(num)) {
            const newHex = `0x${Math.round(num * Math.pow(2, qFormatN))
              .toString(16)
              .padStart(8, '0')}`;
            setHexVal(newHex);
            if (decTimerRef.current) {
              clearTimeout(decTimerRef.current);
            }
            decTimerRef.current = setTimeout(
              () => onValueChange(key, newHex),
              100,
            );
          }
        }}
        size="sm"
        value={decVal}
      />
    </div>
  );
}
