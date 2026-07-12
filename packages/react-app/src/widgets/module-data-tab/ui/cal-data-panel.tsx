/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import {selectCollection} from '@qualcomm-ui/core/select';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import type {CkvDto} from '~entities/spf-module-data';
import {
  GenericTreeView,
  type GenericTreeViewHandle,
} from '~features/generic-tree-view';
import {useGraphDesignerStoreShallow} from '~features/graph-designer';

import {
  calDataDtoToTreeViewData,
  dirtyItemsToCalDataRequest,
} from '../lib/cal-data-adapter';
import {keyValueCollectionToLabel} from '../lib/key-value-label';
import {compareByKeyValueSystemIds} from '../lib/sort-by-key-value';
import {useIndexSwitchDialog} from '../use-index-switch-dialog';

import {IndexSelect} from './index-select';
import {IndexSwitchDialog} from './index-switch-dialog';

interface CalDataPanelProps {
  moduleId: string;
}

function CalDataPanelInner(
  props: CalDataPanelProps,
  ref: React.Ref<GenericTreeViewHandle>,
) {
  const {moduleId} = props;

  const {entry, fetchCalData, setCalUiState, updateCalData} =
    useGraphDesignerStoreShallow((state) => ({
      entry: state.moduleDataByModuleId[moduleId],
      fetchCalData: state.fetchCalData,
      setCalUiState: state.setCalUiState,
      updateCalData: state.updateCalData,
    }));

  const calData = entry?.calData;
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

  const sortedCalIndices = useMemo(
    () =>
      [...(calData?.availableCalIndices ?? [])].sort((a, b) =>
        compareByKeyValueSystemIds(a.keyValueCollection, b.keyValueCollection),
      ),
    [calData?.availableCalIndices],
  );

  const hasCalData = calData !== undefined;
  const selectedCalIndex = calData?.selectedCalIndex;

  useEffect(() => {
    if (!hasCalData || selectedCalIndex) {
      return;
    }
    const [firstIndex] = sortedCalIndices;
    if (firstIndex) {
      void fetchCalData(moduleId, firstIndex.systemId);
    }
  }, [hasCalData, selectedCalIndex, fetchCalData, moduleId, sortedCalIndices]);

  const collection = useMemo(
    () =>
      selectCollection({
        itemLabel: (item: CkvDto) =>
          keyValueCollectionToLabel(item.keyValueCollection),
        items: sortedCalIndices,
        itemValue: (item: CkvDto) => item.systemId,
      }),
    [sortedCalIndices],
  );

  const treeViewData = useMemo(
    () =>
      calData?.dto
        ? calDataDtoToTreeViewData(calData.dto, calData.lastMutation)
        : null,
    [calData?.dto, calData?.lastMutation],
  );

  const isDirty = (calData?.uiState?.dirtyPaths.length ?? 0) > 0;

  const {cancel, discardAndSwitch, handleIndexChange, open, setAndSwitch} =
    useIndexSwitchDialog<string>({
      currentId: calData?.selectedCalIndex,
      findIndex: (id) => id,
      isDirty,
      onDiscard: () => treeViewRef.current?.reset(),
      onSetAndSwitch: async () => {
        if (!calData?.dto) {
          return;
        }
        const dirtyItems = treeViewRef.current?.getEditedTreeViewItems();
        if (dirtyItems) {
          await updateCalData(
            moduleId,
            dirtyItemsToCalDataRequest(dirtyItems, calData.dto),
          );
        }
      },
      onSwitch: (newIndex) => void fetchCalData(moduleId, newIndex),
    });

  return (
    <div className="flex h-full flex-col">
      {calData && calData.availableCalIndices.length > 1 && (
        <IndexSelect
          collection={collection}
          label="Calibration data index"
          onValueChange={handleIndexChange}
          value={calData?.selectedCalIndex}
        />
      )}
      <div className="min-h-0 flex-1">
        {calData?.status === 'error' ? (
          <div
            className="flex h-full items-center justify-center text-sm"
            style={{color: 'var(--color-border-support-danger)'}}
          >
            {calData.error}
          </div>
        ) : treeViewData ? (
          <GenericTreeView
            ref={treeViewRef}
            data={treeViewData}
            hideToolbar={false}
            initialUiState={calData?.uiState}
            onUiStateChange={(patch) => setCalUiState(moduleId, patch)}
            readOnly={false}
            title={entry?.moduleName ?? ''}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ProgressRing />
          </div>
        )}
      </div>
      <IndexSwitchDialog
        onCancel={cancel}
        onDiscardAndSwitch={discardAndSwitch}
        onSetAndSwitch={() => void setAndSwitch()}
        open={open}
      />
    </div>
  );
}

export const CalDataPanel = forwardRef<
  GenericTreeViewHandle,
  CalDataPanelProps
>(CalDataPanelInner);
