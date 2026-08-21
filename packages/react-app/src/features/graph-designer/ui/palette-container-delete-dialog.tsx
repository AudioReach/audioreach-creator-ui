/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';

interface PaletteContainerDeleteDialogProps {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function PaletteContainerDeleteDialog(
  props: PaletteContainerDeleteDialogProps,
) {
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
          <Dialog.Heading>Delete container from subgraph?</Dialog.Heading>
          <Dialog.Description>
            This removes the container from the underlying subgraph and affects
            every usecase where this subgraph is used. After you confirm, this
            cannot be undone in the edit session; discard the edit session if
            you decide not to delete it.
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
            Delete container
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
