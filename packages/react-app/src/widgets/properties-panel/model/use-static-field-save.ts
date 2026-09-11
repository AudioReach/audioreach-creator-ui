/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useRef, useState} from 'react';

export interface SaveResult<T> {
  message?: string;
  ok: boolean;
  value?: T;
}

export interface UseStaticFieldSaveOptions<T> {
  delayMs: number;
  onSave: (nextValue: T) => Promise<SaveResult<T>>;
  value: T;
}

export interface UseStaticFieldSaveResult<T> {
  error: string | null;
  isSaving: boolean;
  saveImmediate: (nextValue: T) => Promise<void>;
  saveText: (nextValue: T) => void;
  value: T;
}

export function useStaticFieldSave<T>({
  delayMs,
  onSave,
  value,
}: UseStaticFieldSaveOptions<T>): UseStaticFieldSaveResult<T> {
  const [draftValue, setDraftValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastGoodValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastGoodValueRef.current = value;
    setDraftValue(value);
  }, [value]);

  const clearPending = useCallback(() => {
    if (!timeoutRef.current) {
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => clearPending, [clearPending]);

  const saveImmediate = useCallback(
    async (nextValue: T) => {
      clearPending();
      setDraftValue(nextValue);
      setIsSaving(true);
      setError(null);

      const result = await onSave(nextValue);

      setIsSaving(false);
      if (!result.ok) {
        setDraftValue(lastGoodValueRef.current);
        setError(result.message ?? 'Save failed');
        return;
      }

      const committed = result.value ?? nextValue;
      lastGoodValueRef.current = committed;
      setDraftValue(committed);
    },
    [clearPending, onSave],
  );

  const saveText = useCallback(
    (nextValue: T) => {
      setDraftValue(nextValue);
      clearPending();
      timeoutRef.current = setTimeout(() => {
        void saveImmediate(nextValue);
      }, delayMs);
    },
    [clearPending, delayMs, saveImmediate],
  );

  return {error, isSaving, saveImmediate, saveText, value: draftValue};
}
