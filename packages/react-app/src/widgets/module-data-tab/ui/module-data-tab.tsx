/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, useImperativeHandle, useRef, useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Tab, Tabs} from '@qualcomm-ui/react/tabs';

import {
  buildDirtyItems,
  type GenericTreeViewHandle,
  type TreeViewData,
  type TreeViewItem,
} from '~features/generic-tree-view';
import {useGraphDesignerStoreShallow} from '~features/graph-designer';
import {logger} from '~shared/lib/logger';
import {hasInvalidPaths, isUiStateDirty} from '~shared/lib/tree-view-ui-state';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

import {
  calDataDtoToTreeViewData,
  dirtyItemsToCalDataRequest,
} from '../lib/cal-data-adapter';
import {tabBadge} from '../lib/tab-badge';
import {
  dirtyItemsToTagDataRequest,
  tagDataDtoToTreeViewData,
} from '../lib/tag-data-adapter';

import {CalDataPanel} from './cal-data-panel';
import {TagDataPanel} from './tag-data-panel';
import {UnsavedChangesDialog} from './unsaved-changes-dialog';

async function writeDirtyTab<Dto, Payload>(
  moduleId: string,
  dto: Dto | undefined,
  uiState: GenericTreeViewUiState | undefined,
  toTreeViewData: (dto: Dto) => TreeViewData,
  toRequest: (items: TreeViewItem[], dto: Dto) => Payload,
  update: (moduleId: string, payload: Payload) => Promise<unknown>,
): Promise<boolean> {
  if (!dto || !uiState || !isUiStateDirty(uiState)) {
    return true;
  }
  const items = toTreeViewData(dto).items;
  const dirtyItems = buildDirtyItems(
    items,
    new Set(uiState.dirtyPaths),
    new Map(Object.entries(uiState.elementValues)),
    new Map(Object.entries(uiState.arrayCounts)),
  );
  const result = await update(moduleId, toRequest(dirtyItems, dto));
  return Boolean(result);
}

export interface ModuleDataTabHandle {
  confirmClose: () => Promise<boolean>;
}

interface ModuleDataTabProps {
  moduleId: string;
}

type SubTab = 'cal-data' | 'tag-data';

function ModuleDataTabInner(
  props: ModuleDataTabProps,
  ref: React.Ref<ModuleDataTabHandle>,
) {
  const {moduleId} = props;

  const {
    entry,
    fetchCalData,
    fetchTagData,
    setCalUiState,
    setModuleOpenTab,
    setTagUiState,
    updateCalData,
    updateTagData,
  } = useGraphDesignerStoreShallow((state) => ({
    entry: state.moduleDataByModuleId[moduleId],
    fetchCalData: state.fetchCalData,
    fetchTagData: state.fetchTagData,
    setCalUiState: state.setCalUiState,
    setModuleOpenTab: state.setModuleOpenTab,
    setTagUiState: state.setTagUiState,
    updateCalData: state.updateCalData,
    updateTagData: state.updateTagData,
  }));

  const [activeTab, setActiveTab] = useState<SubTab>('cal-data');
  // const [batchCopyOpen, setBatchCopyOpen] = useState(false);
  const [closeResolver, setCloseResolver] = useState<
    ((value: boolean) => void) | null
  >(null);

  const calRef = useRef<GenericTreeViewHandle>(null);
  const tagRef = useRef<GenericTreeViewHandle>(null);

  const calUiState = entry?.calData?.uiState;
  const tagUiState = entry?.tagData?.uiState;
  const isTagged = (entry?.tagData?.availableTagIndices.length ?? 0) > 0;
  const effectiveTab: SubTab = isTagged ? activeTab : 'cal-data';

  const activeUiState = effectiveTab === 'cal-data' ? calUiState : tagUiState;
  const activeDirty = isUiStateDirty(activeUiState);
  const activeInvalid = hasInvalidPaths(activeUiState);

  const anyDirty = isUiStateDirty(calUiState) || isUiStateDirty(tagUiState);
  const anyInvalidWhileDirty =
    (isUiStateDirty(calUiState) && hasInvalidPaths(calUiState)) ||
    (isUiStateDirty(tagUiState) && hasInvalidPaths(tagUiState));

  function handleSet() {
    logger.debug('ModuleDataTab: handleSet', {
      action: 'handleSet',
      component: 'ModuleDataTab',
    });
    if (effectiveTab === 'cal-data') {
      const dirtyItems = calRef.current?.getEditedTreeViewItems();
      if (dirtyItems && entry?.calData?.dto) {
        void updateCalData(
          moduleId,
          dirtyItemsToCalDataRequest(dirtyItems, entry.calData.dto),
        );
      }
    } else {
      const dirtyItems = tagRef.current?.getEditedTreeViewItems();
      if (dirtyItems && entry?.tagData?.dto) {
        void updateTagData(
          moduleId,
          dirtyItemsToTagDataRequest(dirtyItems, entry.tagData.dto),
        );
      }
    }
  }

  function handleGet() {
    logger.debug('ModuleDataTab: handleGet', {
      action: 'handleGet',
      component: 'ModuleDataTab',
    });
    if (effectiveTab === 'cal-data') {
      const ckvSystemId = entry?.calData?.selectedCalIndex;
      if (ckvSystemId) {
        void fetchCalData(moduleId, ckvSystemId);
      }
    } else {
      const tagSystemId = entry?.tagData?.selectedTagSystemId;
      const tkvSystemId = entry?.tagData?.selectedTagIndex;
      if (tagSystemId && tkvSystemId) {
        void fetchTagData(moduleId, tagSystemId, tkvSystemId);
      }
    }
  }

  // TODO: no backend Batch Copy endpoint exists yet — re-enable the
  // handlers, button, and dialog below once it lands.
  // function invokeBatchCopyHandler(data?: TreeViewData) {
  //   logger.debug('ModuleDataTab: batch copy stub invoked', {
  //     action: 'invokeBatchCopyHandler',
  //     component: 'ModuleDataTab',
  //     tag: data ? JSON.stringify(data) : undefined,
  //   });
  // }
  //
  // function handleBatchCopy() {
  //   if (!activeDirty) {
  //     const data =
  //       effectiveTab === 'cal-data'
  //         ? calRef.current?.getTreeViewData()
  //         : tagRef.current?.getTreeViewData();
  //     logger.debug('ModuleDataTab: batch copy — clean tab', {
  //       action: 'handleBatchCopy',
  //       component: 'ModuleDataTab',
  //     });
  //     invokeBatchCopyHandler(data);
  //     return;
  //   }
  //   setBatchCopyOpen(true);
  // }
  //
  // function handleBatchCopySetAndCopy() {
  //   handleSet();
  //   invokeBatchCopyHandler();
  //   setBatchCopyOpen(false);
  // }
  //
  // function handleBatchCopyDiscardAndCopy() {
  //   if (effectiveTab === 'cal-data') {
  //     calRef.current?.reset();
  //   } else {
  //     tagRef.current?.reset();
  //   }
  //   invokeBatchCopyHandler();
  //   setBatchCopyOpen(false);
  // }

  async function writeDirtySubTab(tab: SubTab): Promise<boolean> {
    if (tab === 'cal-data') {
      return writeDirtyTab(
        moduleId,
        entry?.calData?.dto,
        entry?.calData?.uiState,
        calDataDtoToTreeViewData,
        dirtyItemsToCalDataRequest,
        updateCalData,
      );
    }

    return writeDirtyTab(
      moduleId,
      entry?.tagData?.dto,
      entry?.tagData?.uiState,
      tagDataDtoToTreeViewData,
      dirtyItemsToTagDataRequest,
      updateTagData,
    );
  }

  async function handleSetAndClose() {
    logger.debug('ModuleDataTab: handleSetAndClose', {
      action: 'handleSetAndClose',
      component: 'ModuleDataTab',
    });
    const [calOk, tagOk] = await Promise.all([
      writeDirtySubTab('cal-data'),
      writeDirtySubTab('tag-data'),
    ]);

    if (!calOk || !tagOk) {
      closeResolver?.(false);
      return;
    }

    setModuleOpenTab(moduleId, null);
    closeResolver?.(true);
    setCloseResolver(null);
  }

  function handleDiscardAndClose() {
    logger.debug('ModuleDataTab: handleDiscardAndClose', {
      action: 'handleDiscardAndClose',
      component: 'ModuleDataTab',
    });
    setCalUiState(moduleId, {dirtyPaths: [], invalidPaths: [], setPaths: []});
    setTagUiState(moduleId, {dirtyPaths: [], invalidPaths: [], setPaths: []});
    setModuleOpenTab(moduleId, null);
    closeResolver?.(true);
    setCloseResolver(null);
  }

  function handleCancelClose() {
    closeResolver?.(false);
    setCloseResolver(null);
  }

  useImperativeHandle(
    ref,
    () => ({
      confirmClose: () =>
        new Promise<boolean>((resolve) => {
          if (!anyDirty) {
            resolve(true);
            return;
          }
          setCloseResolver(() => resolve);
        }),
    }),
    [anyDirty],
  );

  return (
    <div className="flex h-full flex-col" data-testid="module-data-tab">
      <div className="min-h-0 flex-1">
        <Tabs.Root
          activationMode="automatic"
          className="flex h-full"
          lazyMount
          onValueChange={(value) => setActiveTab(value as SubTab)}
          orientation="vertical"
          unmountOnExit
          value={effectiveTab}
        >
          <Tabs.List className="w-9 shrink-0 border-r">
            <Tabs.Indicator />
            <Tab.Root value="cal-data">
              <Tab.Button
                className="h-auto justify-center px-1 py-3"
                endIcon={tabBadge(calUiState)}
              >
                <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
                  Calibration Data
                </span>
              </Tab.Button>
            </Tab.Root>
            {isTagged && (
              <Tab.Root value="tag-data">
                <Tab.Button
                  className="h-auto justify-center px-1 py-3"
                  endIcon={tabBadge(tagUiState)}
                >
                  <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
                    Tag Data
                  </span>
                </Tab.Button>
              </Tab.Root>
            )}
          </Tabs.List>

          <Tabs.Panel className="min-h-0 min-w-0 flex-1" value="cal-data">
            {effectiveTab === 'cal-data' && (
              <CalDataPanel ref={calRef} moduleId={moduleId} />
            )}
          </Tabs.Panel>
          {isTagged && (
            <Tabs.Panel className="min-h-0 min-w-0 flex-1" value="tag-data">
              {effectiveTab === 'tag-data' && (
                <TagDataPanel ref={tagRef} moduleId={moduleId} />
              )}
            </Tabs.Panel>
          )}
        </Tabs.Root>
      </div>
      <div
        className="flex shrink-0 items-center justify-center gap-3 border-t p-3"
        style={{backgroundColor: 'var(--color-surface-primary)'}}
      >
        <Button onClick={handleGet} size="md" variant="outline">
          Get
        </Button>
        <Button
          disabled={!activeDirty || activeInvalid}
          emphasis="primary"
          onClick={handleSet}
          size="md"
          variant="fill"
        >
          Set
        </Button>
        {/* TODO: no backend Batch Copy endpoint exists yet — re-enable
        once it lands.
        <Button onClick={handleBatchCopy} size="md" variant="outline">
          Batch Copy
        </Button> */}
      </div>

      {/* TODO: no backend Batch Copy endpoint exists yet — re-enable
      once it lands.
      <UnsavedChangesDialog
        description="You have unsaved changes. Set them before copying, or discard them."
        discardLabel="Discard Edits & Copy"
        onCancel={() => setBatchCopyOpen(false)}
        onDiscard={handleBatchCopyDiscardAndCopy}
        onSet={handleBatchCopySetAndCopy}
        open={batchCopyOpen}
        setLabel="Set & Copy"
      /> */}

      <UnsavedChangesDialog
        description="You have unsaved changes. Set them before closing, or discard them."
        discardLabel="Discard & Close"
        onCancel={handleCancelClose}
        onDiscard={handleDiscardAndClose}
        onSet={() => void handleSetAndClose()}
        open={closeResolver !== null}
        setDisabled={anyInvalidWhileDirty}
        setLabel="Set & Close"
      />
    </div>
  );
}

export const ModuleDataTab = forwardRef<
  ModuleDataTabHandle,
  ModuleDataTabProps
>(ModuleDataTabInner);
