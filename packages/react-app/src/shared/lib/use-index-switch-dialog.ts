/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

interface UseIndexSwitchDialogParams<TIndex> {
  currentId: string | undefined;
  findIndex: (id: string) => TIndex | undefined;
  isDirty: boolean;
  onDiscard: (index: TIndex) => void;
  onSetAndSwitch: (index: TIndex) => Promise<void> | void;
  onSwitch: (index: TIndex) => void;
}

interface UseIndexSwitchDialogResult {
  cancel: () => void;
  discardAndSwitch: () => void;
  handleIndexChange: (newId: string) => void;
  open: boolean;
  setAndSwitch: () => Promise<void>;
}

export function useIndexSwitchDialog<TIndex>(
  params: UseIndexSwitchDialogParams<TIndex>,
): UseIndexSwitchDialogResult {
  const {currentId, findIndex, isDirty, onDiscard, onSetAndSwitch, onSwitch} =
    params;
  const [pendingIndex, setPendingIndex] = useState<TIndex | null>(null);

  function handleIndexChange(newId: string) {
    if (newId === currentId) {
      return;
    }
    const index = findIndex(newId);
    if (!index) {
      return;
    }
    if (isDirty) {
      setPendingIndex(index);
      return;
    }
    onSwitch(index);
  }

  async function setAndSwitch() {
    const index = pendingIndex;
    setPendingIndex(null);
    if (!index) {
      return;
    }
    await onSetAndSwitch(index);
    onSwitch(index);
  }

  function discardAndSwitch() {
    const index = pendingIndex;
    setPendingIndex(null);
    if (!index) {
      return;
    }
    onDiscard(index);
    onSwitch(index);
  }

  function cancel() {
    setPendingIndex(null);
  }

  return {
    cancel,
    discardAndSwitch,
    handleIndexChange,
    open: pendingIndex !== null,
    setAndSwitch,
  };
}
