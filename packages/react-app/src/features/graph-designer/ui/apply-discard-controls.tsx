/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {Check, Pencil, Trash2} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';

import {showToast} from '~shared/controls/global-toaster';
import {useProjectStoreShallow} from '~shared/store';

import {useApplyDiscard} from '../hooks/use-apply-discard';
import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

import {ApplySummaryDialog} from './apply-summary-dialog';
import {DiscardConfirmDialog} from './discard-confirm-dialog';

export interface ApplyDiscardControlsProps {
  projectId: string;
}

export function ApplyDiscardControls({projectId}: ApplyDiscardControlsProps) {
  // TODO: The real routing signal is provided by the edit-mode feature.
  // Until that lands, treat every session as routing-triggered.
  const routingTriggered = true;
  const {enterEditMode, isDirty, mode} = useGraphDesignerStoreShallow((s) => ({
    enterEditMode: s.enterEditMode,
    isDirty: s.isDirty,
    mode: s.mode,
  }));
  const activeExclusiveMode = useProjectStoreShallow(
    (s) => s.activeExclusiveMode,
  );
  const applyDiscard = useApplyDiscard({projectId, routingTriggered});
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const handleEditClick = async (): Promise<void> => {
    const entered = await enterEditMode();
    if (!entered) {
      showToast("Couldn't start edit mode", 'danger');
    }
  };

  const handleDiscardClick = (): void => {
    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }
    void applyDiscard.discard();
  };

  const handleDiscardConfirm = (): void => {
    setDiscardDialogOpen(false);
    void applyDiscard.discard();
  };

  return (
    <>
      {mode === 'view' && (
        <Button
          disabled={activeExclusiveMode !== 'none'}
          emphasis="neutral"
          onClick={() => void handleEditClick()}
          startIcon={Pencil}
          variant="fill"
        >
          Edit
        </Button>
      )}
      {mode === 'edit' && (
        <>
          <Button
            disabled={!isDirty || applyDiscard.isBusy}
            emphasis="primary"
            onClick={() => void applyDiscard.apply()}
            startIcon={Check}
            variant="fill"
          >
            Apply
          </Button>
          {/* Not gated on isDirty: also the recovery path if a prior
          Apply/Discard committed but exitEditMode failed afterward — the
          session is still 'edit' with nothing left to discard, so clicking
          this retries exiting rather than discarding anything. */}
          <Button
            disabled={applyDiscard.isBusy}
            emphasis="danger"
            onClick={handleDiscardClick}
            startIcon={Trash2}
            variant="fill"
          >
            Discard
          </Button>
          <DiscardConfirmDialog
            onConfirm={handleDiscardConfirm}
            onOpenChange={setDiscardDialogOpen}
            open={discardDialogOpen}
          />
        </>
      )}
      {applyDiscard.pendingReview && (
        <ApplySummaryDialog
          onCancel={applyDiscard.cancelReview}
          onOK={(checkedChangeIds, navChoice) =>
            void applyDiscard.submitReview(checkedChangeIds, navChoice)
          }
          open
          response={applyDiscard.pendingReview.response}
        />
      )}
    </>
  );
}
