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

import type {KeyValueInfo, TagInfoDto} from '~entities/spf-module-data';
import type {GenericTreeViewHandle} from '~features/generic-tree-view';
import {useGraphDesignerStoreShallow} from '~features/graph-designer';
import {isUiStateDirty} from '~shared/lib/tree-view-ui-state';

import {keyValueCollectionToLabel} from '../lib/key-value-label';
import {compareByKeyValueSystemIds} from '../lib/sort-by-key-value';
import {
  dirtyItemsToTagDataRequest,
  tagDataDtoToTreeViewData,
} from '../lib/tag-data-adapter';
import {useIndexSwitchDialog} from '../use-index-switch-dialog';

import {IndexSelect} from './index-select';
import {IndexSwitchDialog} from './index-switch-dialog';
import {ModuleDataPanelBody} from './module-data-panel-body';

interface TagDataPanelProps {
  moduleId: string;
}

interface TkvOption {
  keyValueCollection: KeyValueInfo[];
  label: string;
  tagSystemId: string;
  tkvSystemId: string;
}

function tagToOptions(tag: TagInfoDto): TkvOption[] {
  return (tag.tkvs ?? []).map((tkv) => ({
    keyValueCollection: tkv.keyValueCollection,
    label: `${tag.tagName}: ${keyValueCollectionToLabel(tkv.keyValueCollection)}`,
    tagSystemId: tag.systemId,
    tkvSystemId: tkv.systemId,
  }));
}

function TagDataPanelInner(
  props: TagDataPanelProps,
  ref: React.Ref<GenericTreeViewHandle>,
) {
  const {moduleId} = props;

  const {entry, fetchTagData, setTagUiState, updateTagData} =
    useGraphDesignerStoreShallow((state) => ({
      entry: state.moduleDataByModuleId[moduleId],
      fetchTagData: state.fetchTagData,
      setTagUiState: state.setTagUiState,
      updateTagData: state.updateTagData,
    }));

  const tagData = entry?.tagData;
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

  const options = useMemo(
    () =>
      (tagData?.availableTagIndices ?? [])
        .flatMap(tagToOptions)
        .sort((a, b) =>
          compareByKeyValueSystemIds(
            a.keyValueCollection,
            b.keyValueCollection,
          ),
        ),
    [tagData?.availableTagIndices],
  );

  const hasTagData = tagData !== undefined;
  const selectedTagIndex = tagData?.selectedTagIndex;

  useEffect(() => {
    if (!hasTagData || selectedTagIndex) {
      return;
    }
    const [firstOption] = options;
    if (firstOption) {
      void fetchTagData(
        moduleId,
        firstOption.tagSystemId,
        firstOption.tkvSystemId,
      );
    }
  }, [hasTagData, selectedTagIndex, fetchTagData, moduleId, options]);

  const collection = useMemo(
    () =>
      selectCollection({
        itemLabel: (item: TkvOption) => item.label,
        items: options,
        itemValue: (item: TkvOption) => item.tkvSystemId,
      }),
    [options],
  );

  const treeViewData = useMemo(
    () =>
      tagData?.dto
        ? tagDataDtoToTreeViewData(tagData.dto, tagData.lastMutation)
        : null,
    [tagData?.dto, tagData?.lastMutation],
  );

  const isDirty = isUiStateDirty(tagData?.uiState);

  const {cancel, discardAndSwitch, handleIndexChange, open, setAndSwitch} =
    useIndexSwitchDialog<TkvOption>({
      currentId: tagData?.selectedTagIndex,
      findIndex: (id) => options.find((o) => o.tkvSystemId === id),
      isDirty,
      onDiscard: () => treeViewRef.current?.reset(),
      onSetAndSwitch: async () => {
        if (!tagData?.dto) {
          return;
        }
        const dirtyItems = treeViewRef.current?.getEditedTreeViewItems();
        if (dirtyItems) {
          await updateTagData(
            moduleId,
            dirtyItemsToTagDataRequest(dirtyItems, tagData.dto),
          );
        }
      },
      onSwitch: (option) =>
        void fetchTagData(moduleId, option.tagSystemId, option.tkvSystemId),
    });

  return (
    <div className="flex h-full flex-col">
      {options.length > 1 && (
        <IndexSelect
          collection={collection}
          label="Tag data index"
          onValueChange={handleIndexChange}
          value={tagData?.selectedTagIndex}
        />
      )}
      <ModuleDataPanelBody
        ref={treeViewRef}
        data={treeViewData}
        error={tagData?.error}
        initialUiState={tagData?.uiState}
        onUiStateChange={(patch) => setTagUiState(moduleId, patch)}
        status={tagData?.status}
        title={entry?.moduleName ?? ''}
      />
      <IndexSwitchDialog
        onCancel={cancel}
        onDiscardAndSwitch={discardAndSwitch}
        onSetAndSwitch={() => void setAndSwitch()}
        open={open}
      />
    </div>
  );
}

export const TagDataPanel = forwardRef<
  GenericTreeViewHandle,
  TagDataPanelProps
>(TagDataPanelInner);
