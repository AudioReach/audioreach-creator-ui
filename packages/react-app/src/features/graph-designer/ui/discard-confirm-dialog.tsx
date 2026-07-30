/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';

interface DiscardConfirmDialogProps {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function DiscardConfirmDialog(props: DiscardConfirmDialogProps) {
  const {onConfirm, onOpenChange, open} = props;

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      emphasis="danger"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(false);
        }
      }}
      open={open}
      placement="center"
    >
      <Dialog.FloatingPortal>
        <Dialog.Body>
          <Dialog.IndicatorIcon />
          <Dialog.Heading>Discard all changes?</Dialog.Heading>
          <Dialog.Description>
            This clears every unsaved change in the current session. This cannot
            be undone.
          </Dialog.Description>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            emphasis="neutral"
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            emphasis="danger"
            onClick={onConfirm}
            size="sm"
            variant="fill"
          >
            Discard changes
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
