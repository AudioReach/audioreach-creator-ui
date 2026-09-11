/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Copy, Trash2} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Dialog} from '@qualcomm-ui/react/dialog';

import type {KvSelection} from '~entities/subgraph-definitions';

import {
  formatKvVector,
  type KvVectorDisplayMode,
} from '../lib/kv-vector-format';

const EC_VECTOR_BACKGROUND_COLOR =
  'color-mix(in oklch, var(--color-category-purple-subtle) 35%, transparent)';

/**
 * Renders one persisted or session-added vector in the subgraph list.
 * Edit allows Apply selection, but deletion is limited to session-added vectors.
 */
/** One rendered vector plus its View/Edit-mode actions. */
interface KvVectorRowProps {
  displayMode: KvVectorDisplayMode;
  isEditable: boolean;
  onCopy: (text: string) => void;
  onDelete: (vectorSystemId: string) => void;
  onSelectionChange: (vectorSystemId: string, selected: boolean) => void;
  vector: KvSelection;
}

/** Keeps vector display, selection, copy, and session-local deletion together. */
export function KvVectorRow({
  displayMode,
  isEditable,
  onCopy,
  onDelete,
  onSelectionChange,
  vector,
}: KvVectorRowProps) {
  const formattedVector = formatKvVector(vector, displayMode);
  // Only session-created vectors are removable; persisted vectors stay immutable.
  const canDelete = isEditable && vector.isSessionAdded === true;

  return (
    <div
      className="border-neutral-02 flex min-w-0 items-center gap-2 border-b px-2 py-1.5 last:border-b-0"
      style={
        vector.isEc ? {backgroundColor: EC_VECTOR_BACKGROUND_COLOR} : undefined
      }
    >
      <Checkbox
        aria-label={`Select ${formattedVector}`}
        checked={vector.selected}
        disabled={!isEditable}
        onCheckedChange={(selected) =>
          onSelectionChange(vector.systemId, selected)
        }
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div
          className="text-neutral-primary truncate text-sm"
          title={formattedVector}
        >
          {formattedVector}
        </div>
      </div>
      <IconButton
        aria-label={`Copy ${formattedVector}`}
        icon={Copy}
        onClick={() => onCopy(formattedVector)}
        size="sm"
        title="Copy"
        variant="ghost"
      />
      {canDelete && (
        <Dialog.Root emphasis="danger" placement="center">
          <Dialog.Trigger>
            <IconButton
              aria-label={`Delete ${formattedVector}`}
              emphasis="danger"
              icon={Trash2}
              size="sm"
              title="Delete"
              variant="ghost"
            />
          </Dialog.Trigger>
          <Dialog.FloatingPortal>
            <Dialog.Body>
              <Dialog.IndicatorIcon />
              <Dialog.Heading>Delete KV vector?</Dialog.Heading>
              <Dialog.Description>
                Are you sure you want to delete this KV vector?
              </Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger>
                <Button emphasis="neutral" size="sm" variant="outline">
                  Cancel
                </Button>
              </Dialog.CloseTrigger>
              <Dialog.CloseTrigger>
                <Button
                  emphasis="danger"
                  onClick={() => onDelete(vector.systemId)}
                  size="sm"
                  variant="fill"
                >
                  Delete
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.FloatingPortal>
        </Dialog.Root>
      )}
    </div>
  );
}
