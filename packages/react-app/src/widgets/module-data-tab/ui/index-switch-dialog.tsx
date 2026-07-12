/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {UnsavedChangesDialog} from './unsaved-changes-dialog';

interface IndexSwitchDialogProps {
  onCancel: () => void;
  onDiscardAndSwitch: () => void;
  onSetAndSwitch: () => void;
  open: boolean;
}

export function IndexSwitchDialog(props: IndexSwitchDialogProps) {
  const {onCancel, onDiscardAndSwitch, onSetAndSwitch, open} = props;

  return (
    <UnsavedChangesDialog
      description="You have unsaved changes. Set them before switching, or discard them."
      discardLabel="Discard & Switch"
      onCancel={onCancel}
      onDiscard={onDiscardAndSwitch}
      onSet={onSetAndSwitch}
      open={open}
      setLabel="Set & Switch"
    />
  );
}
