/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';

import {
  SubsystemTreeView,
  TOP_ID,
  TOP_NODE_ID,
} from '~features/subsystem-browser';
import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

interface MoveToSubsystemDialogProps {
  currentParentId: string | null;
  isMoving?: boolean;
  onCancel: () => void;
  onConfirm: (destinationId: string) => void;
  open: boolean;
  tree: SubsystemBrowserTreeNode[];
}

const DEFAULT_EXPANDED_IDS = [TOP_NODE_ID];

// Mounted only while the dialog is open, so selection, search and expansion
// state reset each time the dialog opens.
function MoveToSubsystemDialogContent({
  currentParentId,
  isMoving,
  onCancel,
  onConfirm,
  tree,
}: Omit<MoveToSubsystemDialogProps, 'open'>) {
  const currentId = currentParentId ?? TOP_ID;
  const [selectedId, setSelectedId] = useState(currentId);

  return (
    <>
      <Dialog.Body className="w-lg max-w-[80vw]">
        <Dialog.Heading>Move to Subsystem</Dialog.Heading>
        <div className="border-neutral-02 max-h-[50vh] overflow-y-auto rounded-md border p-2">
          <SubsystemTreeView
            currentSystemId={currentId}
            data={tree}
            defaultExpandedIds={DEFAULT_EXPANDED_IDS}
            onClick={setSelectedId}
            pickerMode
            selectedSystemId={selectedId}
          />
        </div>
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
          disabled={isMoving}
          emphasis="primary"
          onClick={() => {
            if (selectedId === currentId) {
              onCancel();
              return;
            }
            onConfirm(selectedId);
          }}
          size="sm"
          variant="fill"
        >
          OK
        </Button>
      </Dialog.Footer>
    </>
  );
}

export function MoveToSubsystemDialog({
  open,
  ...contentProps
}: MoveToSubsystemDialogProps) {
  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      emphasis="info"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          contentProps.onCancel();
        }
      }}
      open={open}
      placement="center"
      scrollBehavior="inside"
      size="md"
    >
      <Dialog.FloatingPortal>
        {open && <MoveToSubsystemDialogContent {...contentProps} />}
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
