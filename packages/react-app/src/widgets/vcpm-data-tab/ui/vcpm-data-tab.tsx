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
  useState,
} from 'react';

import {selectCollection} from '@qualcomm-ui/core/select';
import {Button} from '@qualcomm-ui/react/button';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {Tab, Tabs} from '@qualcomm-ui/react/tabs';

import {
  buildDirtyItems,
  GenericTreeView,
  type GenericTreeViewHandle,
} from '~features/generic-tree-view';
import {useGraphDesignerStoreShallow} from '~features/graph-designer';
import {VcpmKeyConfiguratorPanel} from '~features/key-configurator';
import {showToast} from '~shared/controls/global-toaster';
import {IndexSelect} from '~shared/controls/index-select';
import {UnsavedChangesDialog} from '~shared/controls/unsaved-changes-dialog';
import {logger} from '~shared/lib/logger';
import {hasInvalidPaths, isUiStateDirty} from '~shared/lib/tree-view-ui-state';
import {useIndexSwitchDialog} from '~shared/lib/use-index-switch-dialog';
import type {ConfiguredCkv} from '~shared/types/key-configurator-config.types';

import {
  dirtyItemsToVcpmUpdateRequests,
  vcpmCalDataToTreeViewData,
} from '../lib/vcpm-tree-adapter';

const SPLIT_PCT_MIN = 20;
const SPLIT_PCT_MAX = 60;

function formatConfiguredCkvLabel(ckv: ConfiguredCkv): string {
  return ckv.keyValuePairs
    .map((pair) => `${pair.key.name}=${pair.value.name}`)
    .join(', ');
}

export interface VcpmDataTabHandle {
  confirmClose: () => Promise<boolean>;
}

export interface VcpmDataTabProps {
  subgraphSystemId: string;
}

function VcpmDataTabInner(
  props: VcpmDataTabProps,
  ref: React.Ref<VcpmDataTabHandle>,
) {
  const {subgraphSystemId} = props;

  const {
    addVcpmCkvs,
    configuredCkvs,
    deleteVcpmCkv,
    entry,
    loadVoiceKeys,
    mode,
    selectVcpmCalIndex,
    setVcpmCalData,
    setVcpmOpenTab,
    setVcpmUiState,
    voiceKeys,
  } = useGraphDesignerStoreShallow((state) => ({
    addVcpmCkvs: state.addVcpmCkvs,
    configuredCkvs:
      state.configuredVcpmCkvsBySubgraphId[subgraphSystemId] ?? [],
    deleteVcpmCkv: state.deleteVcpmCkv,
    entry: state.vcpmDataBySubgraphId[subgraphSystemId],
    loadVoiceKeys: state.loadVoiceKeys,
    mode: state.mode,
    selectVcpmCalIndex: state.selectVcpmCalIndex,
    setVcpmCalData: state.setVcpmCalData,
    setVcpmOpenTab: state.setVcpmOpenTab,
    setVcpmUiState: state.setVcpmUiState,
    voiceKeys: state.voiceKeys,
  }));

  const [isKeyConfiguratorOpen, setIsKeyConfiguratorOpen] = useState(false);
  const [closeResolver, setCloseResolver] = useState<
    ((value: boolean) => void) | null
  >(null);
  // SPLIT_PCT_MAX (the tree pane's share) minimizes the Key Configurator's
  // share — it must always open at this width, per handleToggleKeyConfigurator.
  const [panelSplitPct, setPanelSplitPct] = useState(SPLIT_PCT_MAX);

  const treeViewRef = useRef<GenericTreeViewHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragPctRef = useRef(panelSplitPct);

  useEffect(() => {
    void loadVoiceKeys();
  }, [loadVoiceKeys]);

  // Deliberate VCPM-specific deviation from module/subgraph Key Configurators:
  // auto-close on Edit exit rather than degrading to a read-only view.
  useEffect(() => {
    if (mode !== 'edit') {
      setIsKeyConfiguratorOpen(false);
    }
  }, [mode]);

  const selectedCkvSystemId = entry?.selectedCkvSystemId;
  const parameters = selectedCkvSystemId
    ? entry?.calDataByCkvId?.[selectedCkvSystemId]
    : undefined;

  const treeViewData = useMemo(
    () =>
      parameters && selectedCkvSystemId
        ? vcpmCalDataToTreeViewData(parameters, selectedCkvSystemId)
        : null,
    [parameters, selectedCkvSystemId],
  );
  const hasData = (treeViewData?.items.length ?? 0) > 0;

  const isDirty = isUiStateDirty(entry?.uiState);
  const isInvalid = hasInvalidPaths(entry?.uiState);
  const isSaving = entry?.isSaving ?? false;

  const collection = useMemo(
    () =>
      selectCollection({
        itemLabel: formatConfiguredCkvLabel,
        items: configuredCkvs,
        itemValue: (item: ConfiguredCkv) => item.systemId,
      }),
    [configuredCkvs],
  );

  async function writeDirtyVcpmData(): Promise<boolean> {
    const uiState = entry?.uiState;
    if (!uiState || !isUiStateDirty(uiState) || !treeViewData) {
      return true;
    }
    const dirtyItems = buildDirtyItems(
      treeViewData.items,
      new Set(uiState.dirtyPaths),
      new Map(Object.entries(uiState.elementValues)),
      new Map(Object.entries(uiState.arrayCounts)),
    );
    const requests = dirtyItemsToVcpmUpdateRequests(dirtyItems);

    let failureCount = 0;
    for (const request of requests) {
      // VCPM's PUT is one-parameter-at-a-time, unlike the module tab's
      // batched PUT — each request must land before the next is sent.
      // eslint-disable-next-line no-await-in-loop
      const ok = await setVcpmCalData(
        subgraphSystemId,
        request.systemId,
        request,
      );
      if (!ok) {
        failureCount += 1;
      }
    }

    if (failureCount > 0) {
      showToast(
        `Failed to save ${failureCount} of ${requests.length} VCPM parameter(s)`,
        'danger',
      );
    }
    return failureCount === 0;
  }

  function handleGet() {
    logger.debug('VcpmDataTab: handleGet', {
      action: 'handleGet',
      component: 'VcpmDataTab',
    });
    treeViewRef.current?.reset();
  }

  function handleSet() {
    logger.debug('VcpmDataTab: handleSet', {
      action: 'handleSet',
      component: 'VcpmDataTab',
    });
    void writeDirtyVcpmData();
  }

  async function handleSetAndClose() {
    logger.debug('VcpmDataTab: handleSetAndClose', {
      action: 'handleSetAndClose',
      component: 'VcpmDataTab',
    });
    const ok = await writeDirtyVcpmData();
    if (!ok) {
      closeResolver?.(false);
      return;
    }
    setVcpmOpenTab(subgraphSystemId, null);
    closeResolver?.(true);
    setCloseResolver(null);
  }

  function handleDiscardAndClose() {
    logger.debug('VcpmDataTab: handleDiscardAndClose', {
      action: 'handleDiscardAndClose',
      component: 'VcpmDataTab',
    });
    setVcpmUiState(subgraphSystemId, {
      dirtyPaths: [],
      invalidPaths: [],
      setPaths: [],
    });
    setVcpmOpenTab(subgraphSystemId, null);
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
          if (!isDirty) {
            resolve(true);
            return;
          }
          setCloseResolver(() => resolve);
        }),
    }),
    [isDirty],
  );

  const {cancel, discardAndSwitch, handleIndexChange, open, setAndSwitch} =
    useIndexSwitchDialog<string>({
      currentId: selectedCkvSystemId,
      findIndex: (id) => id,
      isDirty,
      onDiscard: () => treeViewRef.current?.reset(),
      onSetAndSwitch: async () => {
        await writeDirtyVcpmData();
      },
      onSwitch: (newIndex) =>
        void selectVcpmCalIndex(subgraphSystemId, newIndex),
    });

  function handleToggleKeyConfigurator() {
    if (!isKeyConfiguratorOpen) {
      // Key Configurator must always open at its min width, not whatever
      // split the user previously dragged to.
      setPanelSplitPct(SPLIT_PCT_MAX);
      setVcpmUiState(subgraphSystemId, {panelSplitPct: SPLIT_PCT_MAX});
    }
    setIsKeyConfiguratorOpen((current) => !current);
  }

  function handleDragStart() {
    isDraggingRef.current = true;
  }

  function handleSplitterKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }
    e.preventDefault();
    const step = e.shiftKey ? 10 : 2;
    const delta = e.key === 'ArrowRight' ? step : -step;
    const next = Math.min(
      SPLIT_PCT_MAX,
      Math.max(SPLIT_PCT_MIN, panelSplitPct + delta),
    );
    setPanelSplitPct(next);
    setVcpmUiState(subgraphSystemId, {panelSplitPct: next});
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(SPLIT_PCT_MAX, Math.max(SPLIT_PCT_MIN, pct));
      setPanelSplitPct(clamped);
      dragPctRef.current = clamped;
    };
    const onUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setVcpmUiState(subgraphSystemId, {panelSplitPct: dragPctRef.current});
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [setVcpmUiState, subgraphSystemId]);

  return (
    <div className="flex h-full flex-col" data-testid="vcpm-data-tab">
      <div className="min-h-0 flex-1">
        <Tabs.Root
          className="flex h-full"
          orientation="vertical"
          value="vcpm-data"
        >
          <Tabs.List className="w-9 shrink-0 border-r">
            <Tabs.Indicator />
            <Tab.Root value="vcpm-data">
              <Tab.Button className="h-auto justify-center px-1 py-3">
                <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
                  VCPM Data
                </span>
              </Tab.Button>
            </Tab.Root>
          </Tabs.List>

          <Tabs.Panel className="min-h-0 min-w-0 flex-1" value="vcpm-data">
            {entry?.status === 'error' ? (
              <div className="text-support-danger flex h-full items-center justify-center text-sm">
                Failed to load VCPM data
              </div>
            ) : entry?.status === 'ready' ? (
              <div
                ref={containerRef}
                className="relative flex h-full overflow-hidden"
              >
                <div
                  className="flex h-full flex-col"
                  style={{
                    width: isKeyConfiguratorOpen ? `${panelSplitPct}%` : '100%',
                  }}
                >
                  {configuredCkvs.length > 0 && (
                    <IndexSelect
                      collection={collection}
                      label="VCPM calibration index"
                      onValueChange={handleIndexChange}
                      value={selectedCkvSystemId}
                    />
                  )}
                  {hasData && treeViewData ? (
                    <GenericTreeView
                      ref={treeViewRef}
                      data={treeViewData}
                      hideToolbar={false}
                      initialUiState={entry?.uiState}
                      onUiStateChange={(patch) =>
                        setVcpmUiState(subgraphSystemId, patch)
                      }
                      readOnly={false}
                      title="VCPM Data"
                    />
                  ) : (
                    <div className="text-neutral-secondary flex h-full items-center justify-center text-sm">
                      No VCPM data available for this subgraph
                    </div>
                  )}
                </div>
                {isKeyConfiguratorOpen && (
                  <>
                    <div
                      aria-orientation="vertical"
                      aria-valuemax={SPLIT_PCT_MAX}
                      aria-valuemin={SPLIT_PCT_MIN}
                      aria-valuenow={Math.round(panelSplitPct)}
                      className="bg-brand-primary relative w-[3px] shrink-0 cursor-col-resize"
                      onKeyDown={handleSplitterKeyDown}
                      onMouseDown={handleDragStart}
                      role="separator"
                      tabIndex={0}
                    />
                    <div
                      className="h-full overflow-auto"
                      style={{width: `${100 - panelSplitPct}%`}}
                    >
                      <VcpmKeyConfiguratorPanel
                        addVcpmCkvs={(valueSystemIdCombinations) =>
                          addVcpmCkvs(
                            subgraphSystemId,
                            valueSystemIdCombinations,
                          )
                        }
                        configuredCkvs={configuredCkvs}
                        deleteVcpmCkv={(ckvSystemId) =>
                          deleteVcpmCkv(subgraphSystemId, ckvSystemId)
                        }
                        isEditable={mode === 'edit'}
                        voiceKeys={voiceKeys}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <ProgressRing />
              </div>
            )}
          </Tabs.Panel>
        </Tabs.Root>
      </div>
      <div className="bg-primary flex shrink-0 items-center justify-center gap-3 border-t p-3">
        <Button onClick={handleGet} size="md" variant="outline">
          Get
        </Button>
        <Button
          disabled={!isDirty || isInvalid || isSaving}
          emphasis="primary"
          onClick={handleSet}
          size="md"
          variant="fill"
        >
          Set
        </Button>
        <Button
          disabled={mode !== 'edit'}
          onClick={handleToggleKeyConfigurator}
          size="md"
          variant="outline"
        >
          Key Configurator
        </Button>
      </div>

      <UnsavedChangesDialog
        description="You have unsaved changes. Set them before closing, or discard them."
        discardLabel="Discard & Close"
        onCancel={handleCancelClose}
        onDiscard={handleDiscardAndClose}
        onSet={() => void handleSetAndClose()}
        open={closeResolver !== null}
        setDisabled={isInvalid}
        setLabel="Set & Close"
      />

      <UnsavedChangesDialog
        description="You have unsaved changes. Set them before switching, or discard them."
        discardLabel="Discard & Switch"
        onCancel={cancel}
        onDiscard={discardAndSwitch}
        onSet={() => void setAndSwitch()}
        open={open}
        setLabel="Set & Switch"
      />
    </div>
  );
}

export const VcpmDataTab = forwardRef<VcpmDataTabHandle, VcpmDataTabProps>(
  VcpmDataTabInner,
);
