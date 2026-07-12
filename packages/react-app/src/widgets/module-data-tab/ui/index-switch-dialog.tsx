/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';

interface IndexSwitchDialogProps {
  onCancel: () => void;
  onDiscardAndSwitch: () => void;
  onSetAndSwitch: () => void;
  open: boolean;
}

export function IndexSwitchDialog(props: IndexSwitchDialogProps) {
  const {onCancel, onDiscardAndSwitch, onSetAndSwitch, open} = props;

  return (
    <Dialog.Root
      emphasis="warning"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      open={open}
    >
      <Dialog.FloatingPortal>
        <Dialog.Body>
          <Dialog.IndicatorIcon />
          <Dialog.Heading>Unsaved Changes</Dialog.Heading>
          <Dialog.Description>
            You have unsaved changes. Set them before switching, or discard
            them.
          </Dialog.Description>
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
            onClick={onDiscardAndSwitch}
            size="sm"
            variant="outline"
          >
            Discard & Switch
          </Button>
          <Button
            emphasis="primary"
            onClick={onSetAndSwitch}
            size="sm"
            variant="fill"
          >
            Set & Switch
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
