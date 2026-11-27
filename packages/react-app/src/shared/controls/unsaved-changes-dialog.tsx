/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';

interface UnsavedChangesDialogProps {
  description: string;
  discardLabel: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSet: () => void;
  open: boolean;
  setDisabled?: boolean;
  setLabel: string;
}

export function UnsavedChangesDialog(props: UnsavedChangesDialogProps) {
  const {
    description,
    discardLabel,
    onCancel,
    onDiscard,
    onSet,
    open,
    setDisabled = false,
    setLabel,
  } = props;

  return (
    <Dialog.Root
      emphasis="warning"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      open={open}
      placement="center"
    >
      <Dialog.FloatingPortal>
        <Dialog.Body>
          <Dialog.IndicatorIcon />
          <Dialog.Heading>Unsaved Changes</Dialog.Heading>
          <Dialog.Description>{description}</Dialog.Description>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            emphasis="neutral"
            onClick={onCancel}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            emphasis="neutral"
            onClick={onDiscard}
            size="sm"
            variant="outline"
          >
            {discardLabel}
          </Button>
          <Button
            disabled={setDisabled}
            emphasis="primary"
            onClick={onSet}
            size="sm"
            variant="fill"
          >
            {setLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
