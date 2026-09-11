/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import {
  GenericTreeView,
  type TreeViewData,
  type TreeViewItem,
} from '~features/generic-tree-view';

export interface SchemaPropertiesTreeProps {
  data: TreeViewData | null;
  error: string | null;
  isEditing: boolean;
  isLoading: boolean;
  onCommit: (dirtyItems: TreeViewItem[]) => void;
  onRetry: () => void;
  title: string;
}

export function SchemaPropertiesTree({
  data,
  error,
  isEditing,
  isLoading,
  onCommit,
  onRetry,
  title,
}: SchemaPropertiesTreeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-[var(--color-text-secondary)]">
        <ProgressRing size="sm" />
        <span>Loading schema properties</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 py-3" role="alert">
        <p className="text-sm text-[var(--color-text-danger)]">{error}</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="py-3 text-sm text-[var(--color-text-secondary)]">
        No schema properties
      </p>
    );
  }

  return (
    <GenericTreeView
      autoCommit={{onCommit}}
      data={data}
      defaultPolicyFilter={['BASIC', 'ADVANCED']}
      defaultViewMode="legacy"
      hideToolbar
      readOnly={!isEditing}
      title={title}
    />
  );
}
