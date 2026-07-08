/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

import type {TreeViewData, TreeViewItem} from './tree-view-data';

export interface ClipboardPayload {
  lines: string;
}

export interface TreeViewNotification {
  message: string;
  type: 'error' | 'info' | 'warning';
}

export interface GenericTreeViewProps {
  autoCommit?: {
    onCommit: (dirtyItems: TreeViewItem[]) => void;
  };
  className?: string;
  data: TreeViewData;
  defaultPolicyFilter?: ('ADVANCED' | 'BASIC')[];
  defaultViewMode?: 'legacy' | 'modern';
  hideToolbar?: boolean;
  initialUiState?: GenericTreeViewUiState;
  onCopy?: (payload: ClipboardPayload) => void;
  onExport?: (payload: ClipboardPayload) => void;
  onImport?: () => Promise<ClipboardPayload>;
  onNotify?: (notification: TreeViewNotification) => void;
  onPaste?: () => Promise<ClipboardPayload>;
  onUiStateChange?: (patch: Partial<GenericTreeViewUiState>) => void;
  readOnly?: boolean;
  title: string;
}

export interface GenericTreeViewHandle {
  getEditedTreeViewItems: () => TreeViewItem[] | null;
  getTreeViewData: () => TreeViewData;
  reset: () => void;
}
