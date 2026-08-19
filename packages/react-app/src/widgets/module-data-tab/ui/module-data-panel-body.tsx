/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, useImperativeHandle, useRef} from 'react';

import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import {
  GenericTreeView,
  type GenericTreeViewHandle,
  type TreeViewData,
} from '~features/generic-tree-view';
import type {SliceStatus} from '~shared/store/global-store.types';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

interface ModuleDataPanelBodyProps {
  data: TreeViewData | null;
  error: string | undefined;
  initialUiState: GenericTreeViewUiState | undefined;
  onUiStateChange: (patch: Partial<GenericTreeViewUiState>) => void;
  status: SliceStatus | undefined;
  title: string;
}

function ModuleDataPanelBodyInner(
  props: ModuleDataPanelBodyProps,
  ref: React.Ref<GenericTreeViewHandle>,
) {
  const {data, error, initialUiState, onUiStateChange, status, title} = props;
  const treeViewRef = useRef<GenericTreeViewHandle>(null);

  useImperativeHandle(
    ref,
    () => ({
      getEditedTreeViewItems: () =>
        treeViewRef.current?.getEditedTreeViewItems() ?? null,
      getTreeViewData: () =>
        treeViewRef.current?.getTreeViewData() ?? {items: [], systemId: ''},
      reset: () => treeViewRef.current?.reset(),
    }),
    [],
  );

  return (
    <div className="min-h-0 flex-1">
      {status === 'error' ? (
        <div className="text-support-danger flex h-full items-center justify-center text-sm">
          {error}
        </div>
      ) : data ? (
        <GenericTreeView
          ref={treeViewRef}
          data={data}
          hideToolbar={false}
          initialUiState={initialUiState}
          onUiStateChange={onUiStateChange}
          readOnly={false}
          title={title}
        />
      ) : status === 'ready' ? (
        <div className="text-neutral-secondary flex h-full items-center justify-center text-sm">
          No data available for this module
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <ProgressRing />
        </div>
      )}
    </div>
  );
}

export const ModuleDataPanelBody = forwardRef<
  GenericTreeViewHandle,
  ModuleDataPanelBodyProps
>(ModuleDataPanelBodyInner);
