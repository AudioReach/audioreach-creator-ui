/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {
  Clipboard,
  Cpu,
  Download,
  Edit,
  FileText,
  LayoutFreeform,
  Package,
  Redo,
  Search,
  SlidersHorizontal,
  Type,
  Undo,
  Upload,
  Wand2,
} from 'lucide-react';
import {createPortal} from 'react-dom';

import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import {type LevelView, NODE_KIND, type NodeKind} from '~entities/graph';
import {MAJOR_MODULE_TYPE} from '~entities/module-definitions';
import {
  formatUsecaseName,
  getLeafItems,
  getSystemIdsFromFormattedUsecases,
  getUsecaseKeyValueKey,
  type UsecaseCategory,
  type UsecaseDto,
  type UsecaseItem,
} from '~entities/usecases';
import {
  ApplyDiscardControls,
  type ApplyUsecaseChangesArgs,
  computeReloadUsecases,
  createLinkOperations,
  deleteSelection,
  GraphDesignerStoreContext,
  isSubsystemScopedFilter,
  parseModuleDropPayload,
  parseSubgraphDropPayload,
  type GraphDesignerStore,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {toMoveDestination, withTopNode} from '~features/subsystem-browser';
import {keyConfiguratorStoreManager} from '~features/key-configurator';
import {
  PortConnectionsInfoPopup,
  usePortConnectionsInfo,
} from '~features/port-connections-info';
import {SearchComponent} from '~features/search-component';
import {
  UsecaseSelectionControl,
  useWorkflowUsecaseData,
} from '~features/usecase-selection';
import {
  type ContextMenuTarget,
  type EdgeConnectPayload,
  type NodeDropPayload,
  type SearchHighlights,
  type SelectionChangePayload,
  UsecaseVisualizer,
  type ViewportState,
  VISUALIZER_MODE,
  type VisualizerContextMenuConfig,
  type XY,
} from '~features/usecase-visualizer';
import {ConfigFileManager} from '~shared/config/config-manager';
import {useUserPreferences} from '~shared/config/hooks';
import {WORKFLOW_TYPES} from '~shared/config/user-preferences-types';
import {ArcBreadcrumbs} from '~shared/controls/arc-breadcrumbs';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {useRegisterSideNav, useSideNav} from '~shared/lib/side-nav';
import {useProjectLayoutStore, useProjectStoreShallow} from '~shared/store';
import {deepEqual} from '~shared/utils/deep-equality';
import {formatModuleInstanceId} from '~shared/utils/format-module-instance-id';
import {
  ModuleDataTab,
  type ModuleDataTabHandle,
} from '~widgets/module-data-tab';
import {tabLayoutService} from '~widgets/project-layout/project-layout-manager';

import {applyCollapses} from '../lib/apply-collapses';
import {
  buildContextMenuConfig,
  containingSubsystemIdOf,
} from '../lib/context-menu-config';
import {applyLinkVisibility} from '../lib/apply-link-visibility';
import {applyPortVisibility} from '../lib/apply-port-visibility';
import {applyPositionOverrides} from '../lib/apply-position-overrides';
import {applyPpHighlight} from '../lib/apply-pp-highlight';
import {
  computeContainsMatchIds,
  searchLevelView,
  type SearchMatch,
} from '../lib/graph-search';
import {
  buildDroppedModulePlacementOverrides,
  type ModuleDropPlacement,
} from '../lib/dropped-module-position-overrides';
import {usecaseSelectionsMatch} from '../lib/usecase-selection';
import {
  buildLevelViewFromGraphData,
  buildSubsystemLevelViewFromGraphData,
} from '../lib/level-view-adapter';
import {layoutLevelView} from '../lib/level-view-layout';
import {mapSelectedNodesToConfigurationItems} from '../lib/node-to-config-item';
import {subgraphNodeId, subgraphProxyNodeId} from '../lib/node-id';
import {renderNodeContent} from '../lib/render-node-content';
import {collapseSetForLevel} from '../lib/subgraph-collapse';
import {buildSubsystemBreadcrumbPath} from '../lib/subsystem-breadcrumbs';

import {DisplayOptionsPopover} from './display-options-popover';
import {MoveToSubsystemDialog} from './move-to-subsystem-dialog';
import {useSubgraphKvMetadataRefresh} from './use-subgraph-kv-metadata-refresh';

interface GraphDesignerProps {
  projectId: string;
  screenshotRegistry: Map<string, () => Promise<string | null>>;
  tabId?: string;
}

const EMPTY_SET: ReadonlySet<number> = new Set<number>();
const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();
const EMPTY_LEVEL_VIEW: LevelView = {levelId: ''};
const EMPTY_POSITION_OVERRIDES: Readonly<Record<string, XY>> = {};
const EMPTY_PARENT_SIZES: Readonly<
  Record<string, {height: number; width: number}>
> = {};

function parseSubgraphSystemId(subgraphId: string): number | null {
  const parsed = Number(subgraphId);
  return Number.isFinite(parsed) ? parsed : null;
}

function graphDataHasContent(
  graphData: GraphDesignerStore['graphData'],
): boolean {
  if (!graphData) {
    return false;
  }
  return (
    graphData.connections.length > 0 ||
    Object.keys(graphData.containers).length > 0 ||
    Object.keys(graphData.moduleInstances).length > 0 ||
    Object.keys(graphData.subgraphs).length > 0 ||
    Object.keys(graphData.subsystems).length > 0
  );
}

function getSelectedUsecaseNamesFromSystemIds(
  systemIds: string[],
  usecaseData: UsecaseCategory[],
): {names: string[]; systemIds: string[]} {
  const itemBySystemId = new Map<string, UsecaseItem>();
  for (const category of usecaseData) {
    for (const item of getLeafItems(category.items)) {
      if (item.systemId) {
        itemBySystemId.set(item.systemId, item);
      }
    }
  }
  const names: string[] = [];
  const resolvedSystemIds: string[] = [];

  for (const systemId of systemIds) {
    const item = itemBySystemId.get(systemId);
    const name = item?.name;
    if (!name) {
      continue;
    }
    names.push(name);
    resolvedSystemIds.push(systemId);
  }

  return {names: [...new Set(names)], systemIds: resolvedSystemIds};
}

function applyUsecaseNameFallbacks(
  usecaseData: UsecaseCategory[],
  fallbackNamesBySystemId: Readonly<Record<string, string>>,
): UsecaseCategory[] {
  if (Object.keys(fallbackNamesBySystemId).length === 0) {
    return usecaseData;
  }

  const applyFallbacksToItems = (items: UsecaseItem[]): UsecaseItem[] =>
    items.map((item) => {
      const fallbackName = item.systemId
        ? fallbackNamesBySystemId[item.systemId]
        : undefined;
      const nextItem = {...item, name: item.name || fallbackName || ''};
      if (item.children) {
        nextItem.children = applyFallbacksToItems(item.children);
      }
      return nextItem;
    });

  return usecaseData.map((category) => ({
    ...category,
    items: applyFallbacksToItems(category.items),
  }));
}

const GraphDesigner: React.FC<GraphDesignerProps> = ({
  projectId,
  screenshotRegistry,
  tabId,
}) => {
  // Get selected usecases from tab store
  const selectedUsecases = useGraphDesignerStoreShallow(
    (state) => state.selectedUsecases,
  );
  const setSelectedUsecases = useGraphDesignerStoreShallow(
    (state) => state.setSelectedUsecases,
  );
  const isEditable = useProjectStoreShallow((s) => s.editModeState === 'edit');

  const {preferences, updatePreference} = useUserPreferences();
  const {
    highlightPPModules,
    showContainerIds,
    showControlLinks,
    showInterUsecaseLinks,
    showModuleInstanceIds,
    showSubgraphIds,
    simplifySubsystems,
    viewMode,
  } = preferences.visualization;
  const isDetailedView = viewMode === 'detailed';
  const effectivePortVisibilityMode = isEditable
    ? 'all'
    : isDetailedView
      ? preferences.display.portVisibilityMode
      : 'active';
  const {namePreference, workflowLevel, workflowType} = preferences.usecases;
  const filterComponentsBySubsystem = isSubsystemScopedFilter(
    preferences.usecases,
  );

  const {
    isLoading: isWorkflowLoading,
    refresh: refreshWorkflowUsecaseData,
    resolvedData,
  } = useWorkflowUsecaseData(projectId, workflowType, workflowLevel);
  const [usecaseNameFallbacksBySystemId, setUsecaseNameFallbacksBySystemId] =
    useState<Record<string, string>>({});
  const resolvedUsecaseData = useMemo(
    () =>
      applyUsecaseNameFallbacks(resolvedData, usecaseNameFallbacksBySystemId),
    [resolvedData, usecaseNameFallbacksBySystemId],
  );
  const selectedUsecaseSystemIds = useMemo(
    () =>
      getSystemIdsFromFormattedUsecases(selectedUsecases, resolvedUsecaseData),
    [selectedUsecases, resolvedUsecaseData],
  );

  const handleApplyUsecaseChanges = useCallback(
    async ({
      createdSystemIds,
      createdUsecases,
      currentSystemIds,
      deletedSystemIds,
      navChoice,
      updatedSystemIds,
    }: ApplyUsecaseChangesArgs): Promise<string[]> => {
      const refreshedData = await refreshWorkflowUsecaseData();
      const deletedIds = new Set(deletedSystemIds);
      const nextFallbackEntries = Object.entries(
        usecaseNameFallbacksBySystemId,
      ).filter(([systemId]) => !deletedIds.has(systemId));
      for (const {displayName, systemId} of createdUsecases) {
        if (displayName) {
          nextFallbackEntries.push([systemId, displayName]);
        }
      }
      const nextFallbackNames = Object.fromEntries(nextFallbackEntries);
      setUsecaseNameFallbacksBySystemId(nextFallbackNames);
      const nextSystemIds = computeReloadUsecases(
        navChoice,
        createdSystemIds,
        deletedSystemIds,
        currentSystemIds,
        updatedSystemIds,
      );
      const refreshedUsecaseData = applyUsecaseNameFallbacks(
        refreshedData,
        nextFallbackNames,
      );
      const resolvedSelection = getSelectedUsecaseNamesFromSystemIds(
        nextSystemIds,
        refreshedUsecaseData,
      );

      setSelectedUsecases(resolvedSelection.names);
      return resolvedSelection.systemIds;
    },
    [
      refreshWorkflowUsecaseData,
      setSelectedUsecases,
      usecaseNameFallbacksBySystemId,
    ],
  );

  // Persist / restore the default selected usecases via the config
  // The flag lives in the tab store, so it survives this component remounting.
  const defaultUsecasesApplied = useGraphDesignerStoreShallow(
    (state) => state.defaultUsecasesApplied,
  );
  const markDefaultUsecasesApplied = useGraphDesignerStoreShallow(
    (state) => state.markDefaultUsecasesApplied,
  );
  const restoreDoneRef = useRef(false);
  const saveArmedRef = useRef(false);
  const syncedKeysRef = useRef<string[]>([]);
  const isUsecaseListReady = !isWorkflowLoading && resolvedData.length > 0;

  const leafUsecases = useMemo(
    () => resolvedData.flatMap((cat) => getLeafItems(cat.items)),
    [resolvedData],
  );

  const selectedUsecaseKeys = useMemo(() => {
    const selected = new Set(selectedUsecases);
    return leafUsecases
      .filter((item) => selected.has(item.name))
      .map(getUsecaseKeyValueKey);
  }, [selectedUsecases, leafUsecases]);

  // Restore once, as soon as the usecase list is available.
  useEffect(() => {
    if (restoreDoneRef.current || !isUsecaseListReady) {
      return;
    }
    restoreDoneRef.current = true;

    // Already restored and mounted again: keep the tab's own selection.
    if (defaultUsecasesApplied) {
      saveArmedRef.current = true;
      syncedKeysRef.current = selectedUsecaseKeys;
      return;
    }
    markDefaultUsecasesApplied();

    const keySet = new Set(
      ConfigFileManager.instance.getSelectedUsecaseKeys() ?? [],
    );
    // Defaults this project does not have are skipped.
    const matched = leafUsecases.filter((item) =>
      keySet.has(getUsecaseKeyValueKey(item)),
    );
    // Remember what was restored so it is not saved back as a user change.
    syncedKeysRef.current = matched.map(getUsecaseKeyValueKey);
    setSelectedUsecases(matched.map((item) => item.name));
  }, [
    defaultUsecasesApplied,
    isUsecaseListReady,
    leafUsecases,
    markDefaultUsecasesApplied,
    selectedUsecaseKeys,
    setSelectedUsecases,
  ]);

  // Save the selection when the user changes it. Other open projects keep
  // their own selection; the new default applies to projects opened later.
  useEffect(() => {
    if (!restoreDoneRef.current) {
      return;
    }
    // Skip the initial save until the restored selection is applied.
    if (!saveArmedRef.current) {
      saveArmedRef.current = true;
      return;
    }
    if (deepEqual(selectedUsecaseKeys, syncedKeysRef.current)) {
      return;
    }
    syncedKeysRef.current = selectedUsecaseKeys;
    ConfigFileManager.instance.setSelectedUsecaseKeys(selectedUsecaseKeys);
  }, [selectedUsecaseKeys]);

  // Derived flags for UsecaseSelectionControl
  const isSystemWorkflow = workflowType === WORKFLOW_TYPES.SYSTEM;

  // Graph data from store
  const graphData = useGraphDesignerStoreShallow((s) => s.graphData);
  const subsystemData = useGraphDesignerStoreShallow((s) => s.subsystemData);
  const subsystemPickTree = useMemo(
    () => withTopNode(subsystemData),
    [subsystemData],
  );
  const graphDataError = useGraphDesignerStoreShallow((s) => s.graphDataError);
  const graphDataStatus = useGraphDesignerStoreShallow(
    (s) => s.graphDataStatus,
  );
  const initializeEmptyGraphData = useGraphDesignerStoreShallow(
    (s) => s.initializeEmptyGraphData,
  );
  const loadGraphData = useGraphDesignerStoreShallow((s) => s.loadGraphData);
  const levelView = useGraphDesignerStoreShallow((s) => s.levelView);
  const setLevelView = useGraphDesignerStoreShallow((s) => s.setLevelView);
  const setEffectiveLevelView = useGraphDesignerStoreShallow(
    (s) => s.setEffectiveLevelView,
  );
  const clearLevelView = useGraphDesignerStoreShallow((s) => s.clearLevelView);
  const focusNodeRequest = useGraphDesignerStoreShallow(
    (s) => s.focusNodeRequest,
  );
  const clearNodeFocusRequest = useGraphDesignerStoreShallow(
    (s) => s.clearNodeFocusRequest,
  );
  const clearActiveSubsystem = useGraphDesignerStoreShallow(
    (s) => s.clearActiveSubsystem,
  );
  const setSubsystemData = useGraphDesignerStoreShallow(
    (s) => s.setSubsystemData,
  );
  const navigateToSubsystem = useGraphDesignerStoreShallow(
    (s) => s.navigateToSubsystem,
  );
  const moduleListStatus = useGraphDesignerStoreShallow(
    (s) => s.moduleListStatus,
  );
  const loadModuleList = useGraphDesignerStoreShallow((s) => s.loadModuleList);
  const subgraphListStatus = useGraphDesignerStoreShallow(
    (s) => s.subgraphListStatus,
  );
  const loadSubgraphList = useGraphDesignerStoreShallow(
    (s) => s.loadSubgraphList,
  );
  const syncEnableOverlays = useGraphDesignerStoreShallow(
    (s) => s.syncEnableOverlays,
  );

  // Active subsystem for scoped canvas view (set by Subsystem Browser panel).
  const activeSubsystemId = useGraphDesignerStoreShallow(
    (s) => s.activeSubsystemId,
  );
  const subsystemNavigationRequestId = useGraphDesignerStoreShallow(
    (s) => s.subsystemNavigationRequestId,
  );

  const breadcrumbItems = useMemo(() => {
    if (!graphData) {
      return [];
    }

    const path = buildSubsystemBreadcrumbPath(
      activeSubsystemId,
      graphData.subsystems,
    );
    return path.map((segment, index) => {
      const childSubsystemIds = segment.systemId
        ? (graphData.subsystems[segment.systemId]?.childSubsystemIds ?? [])
        : [];
      const childItems = segment.systemId
        ? [...new Set(childSubsystemIds)].flatMap((childSystemId) => {
            const child = graphData.subsystems[childSystemId];
            return child
              ? [
                  {
                    label: child.subsystemName,
                    onClick: () => navigateToSubsystem(child.subsystemId),
                  },
                ]
              : [];
          })
        : [];

      return {
        label: segment.label,
        ...(childItems.length > 0 ? {dropdownItems: childItems} : {}),
        ...(index < path.length - 1
          ? {onClick: () => navigateToSubsystem(segment.systemId)}
          : {}),
      };
    });
  }, [activeSubsystemId, graphData, navigateToSubsystem]);

  // Module list, for deriving which modules are PP for Highlight PP Modules.
  const moduleList = useGraphDesignerStoreShallow((s) => s.moduleList);

  // Store API for imperative action calls and provider value for new tabs.
  const store = useGraphDesignerStore();
  // SGKV metadata is lifecycle work, not Key Configurator-tab work.
  useSubgraphKvMetadataRefresh(projectId);

  // Backend-call core for drawing/deleting connections on the canvas.
  const linkOperations = useMemo(
    () => createLinkOperations(projectId),
    [projectId],
  );

  // Keyed by moduleInstanceId (nodeId) so the tab-close callback can reach
  // the specific ModuleDataTab instance's confirmClose() handle.
  const moduleDataTabRefs = useRef(
    new Map<string, React.RefObject<ModuleDataTabHandle | null>>(),
  );

  // Synchronous lock so a second double-click on the same module during the
  // in-flight queryModuleData() await can't also pass the moduleOpenTabs
  // guard and create a duplicate tab.
  const pendingModuleOpensRef = useRef(new Set<string>());

  // Collapse, position-override, and viewport state (consumer-owned).
  const [collapseByLevel, setCollapseByLevel] = useState<
    Record<string, Set<number>>
  >({});
  const [positionOverridesByLevel, setPositionOverridesByLevel] = useState<
    Record<string, Record<string, XY>>
  >({});
  const positionOverridesByLevelRef = useRef(positionOverridesByLevel);
  const [parentSizesByLevel, setParentSizesByLevel] = useState<
    Record<string, Record<string, {height: number; width: number}>>
  >({});
  const [viewportByLevel, setViewportByLevel] = useState<
    Record<string, ViewportState>
  >({});
  const [moveNodeId, setMoveNodeId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const levelId = levelView?.levelId ?? '';
  const collapsedSubgraphs = collapseByLevel[levelId] ?? EMPTY_SET;
  const positionOverrides =
    positionOverridesByLevel[levelId] ?? EMPTY_POSITION_OVERRIDES;
  const parentSizes = parentSizesByLevel[levelId] ?? EMPTY_PARENT_SIZES;

  // Shows a blur overlay while a large graph recompute is in progress, so
  // the screen doesn't look frozen.
  const [isExpandCollapsePending, startExpandCollapseTransition] =
    useTransition();
  const expandCollapseLabel = preferences.visualization.expandSubgraphs
    ? 'Expanding Subgraphs'
    : 'Collapsing Subgraphs';

  // Last checkbox value applied, to detect a checkbox click vs. a level load.
  const appliedExpandSubgraphsRef = useRef(
    preferences.visualization.expandSubgraphs,
  );

  // Compares levelId plus subgraph ids together, so a link mutation doesn't reset the subgraphs the user manually expanded or collapsed.
  const appliedLevelSignatureRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    positionOverridesByLevelRef.current = positionOverridesByLevel;
  }, [positionOverridesByLevel]);

  // Keep subsystem navigation when Graph Designer is remounted after switching
  // to a project tab. The subsystem scope should only reset when the selected
  // usecases actually change.
  const previousSelectedUsecasesRef = useRef(selectedUsecases);

  useEffect(() => {
    // Compare previous and latest usecase selections by system ID.
    // Only a change in system IDs should reset the selected subsystem.
    const previousSelectedUsecaseSystemIds = getSystemIdsFromFormattedUsecases(
      previousSelectedUsecasesRef.current,
      resolvedData,
    );

    if (
      !usecaseSelectionsMatch(
        previousSelectedUsecaseSystemIds,
        selectedUsecaseSystemIds,
      )
    ) {
      clearActiveSubsystem();
    }
    previousSelectedUsecasesRef.current = selectedUsecases;
  }, [
    clearActiveSubsystem,
    resolvedData,
    selectedUsecases,
    selectedUsecaseSystemIds,
  ]);

  // Applies expandSubgraphs to the current level; overlay only on checkbox click.
  useEffect(() => {
    if (!levelView) {
      return;
    }
    const subgraphIds = (levelView.subgraphs ?? [])
      .map((sg) => sg.subgraphId)
      .sort((a, b) => a - b);
    const levelSignature = `${levelView.levelId}:${subgraphIds.join(',')}`;
    const levelChanged = appliedLevelSignatureRef.current !== levelSignature;
    const checkboxChanged =
      appliedExpandSubgraphsRef.current !==
      preferences.visualization.expandSubgraphs;

    // Add/delete rebuilds levelView without changing the level or the
    // checkbox — reapplying here would discard whatever the user has manually
    // expanded or collapsed.
    if (!levelChanged && !checkboxChanged) {
      return;
    }

    appliedLevelSignatureRef.current = levelSignature;
    appliedExpandSubgraphsRef.current =
      preferences.visualization.expandSubgraphs;

    const apply = () => {
      setCollapseByLevel((prev) => ({
        ...prev,
        [levelView.levelId]: collapseSetForLevel(
          levelView,
          preferences.visualization.expandSubgraphs,
        ),
      }));
    };

    if (checkboxChanged) {
      startExpandCollapseTransition(apply);
    } else {
      apply();
    }
  }, [levelView, preferences.visualization.expandSubgraphs]);

  // Module list is loaded by the effect above; PP Highlight reads it here.
  const ppModuleIds = useMemo(() => {
    if (!highlightPPModules) {
      return EMPTY_STRING_SET;
    }
    return new Set(
      moduleList
        .filter((m) => m.category === MAJOR_MODULE_TYPE.PP)
        .map((m) => m.moduleDefinitionSystemId),
    );
  }, [highlightPPModules, moduleList]);

  // Collapse/visibility/highlight only depend on levelView and their own
  // toggles, so a node drag (positionOverrides/parentSizes changing) doesn't
  // force a redundant re-filter of links or re-stamp of PP modules.
  const filteredAndHighlighted = useMemo<LevelView>(() => {
    if (!levelView) {
      return EMPTY_LEVEL_VIEW;
    }
    const collapsed = applyCollapses(levelView, collapsedSubgraphs);
    const linkFiltered = applyLinkVisibility(
      collapsed,
      showControlLinks,
      showInterUsecaseLinks,
    );
    return applyPpHighlight(linkFiltered, ppModuleIds);
  }, [
    levelView,
    collapsedSubgraphs,
    showControlLinks,
    showInterUsecaseLinks,
    ppModuleIds,
  ]);

  const graph = useMemo<LevelView>(() => {
    return applyPositionOverrides(
      filteredAndHighlighted,
      positionOverrides,
      parentSizes,
    );
  }, [filteredAndHighlighted, parentSizes, positionOverrides]);

  useEffect(() => {
    setEffectiveLevelView(graph);
  }, [graph, setEffectiveLevelView]);

  // Guards against stale layout results when selectedUsecases changes rapidly.
  const layoutGenerationRef = useRef(0);

  // Search state
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchingNodes, setMatchingNodes] = useState<SearchMatch[]>([]);
  const [searchHighlights, setSearchHighlights] = useState<
    SearchHighlights | undefined
  >(undefined);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchCount = matchingNodes.length;

  const clearSelection = useGraphDesignerStoreShallow((s) => s.clearSelection);
  const setSearchHighlight = useGraphDesignerStoreShallow(
    (s) => s.setSearchHighlight,
  );
  const clearSearchHighlight = useGraphDesignerStoreShallow(
    (s) => s.clearSearchHighlight,
  );
  const setSelection = useGraphDesignerStoreShallow((s) => s.setSelection);
  const keyConfiguratorStore = useMemo(
    () => keyConfiguratorStoreManager.getStore(projectId),
    [projectId],
  );
  const setKeyConfiguratorSelectedItems = keyConfiguratorStore(
    (state) => state.setSelectedItems,
  );
  const isSearchVisible = useGraphDesignerStoreShallow(
    (s) => s.isSearchVisible,
  );
  const setSearchVisible = useGraphDesignerStoreShallow(
    (s) => s.setSearchVisible,
  );
  const currentSearchTerm = useGraphDesignerStoreShallow((s) => s.searchTerm);
  const {addToHistory, history, setSearchTerm} = useGraphDesignerStoreShallow(
    (s) => ({
      addToHistory: s.addToHistory,
      history: s.history,
      setSearchTerm: s.setSearchTerm,
    }),
  );

  // Always keep the ref pointing to the latest isSearchVisible and currentSearchTerm
  // so the effect below can call it without listing it as a dependency.
  const isSearchVisibleRef = useRef(isSearchVisible);
  isSearchVisibleRef.current = isSearchVisible;

  const currentSearchTermRef = useRef(currentSearchTerm);
  currentSearchTermRef.current = currentSearchTerm;

  // Opens the search panel and focuses the input (works whether panel is new or
  // already visible)
  const openSearch = useCallback(() => {
    setSearchVisible(true);
    setSearchFocusTrigger((prev) => prev + 1);
  }, [setSearchVisible]);

  // Resets all search state — call when usecase changes or search is closed
  const resetSearch = useCallback(() => {
    setHasSearched(false);
    setMatchingNodes([]);
    setSearchHighlights(undefined);
    setCurrentMatchIndex(0);
    clearSearchHighlight();
  }, [clearSearchHighlight]);

  const previousSubsystemNavigationRequestIdRef = useRef(
    subsystemNavigationRequestId,
  );

  useEffect(() => {
    if (
      previousSubsystemNavigationRequestIdRef.current ===
      subsystemNavigationRequestId
    ) {
      return;
    }
    previousSubsystemNavigationRequestIdRef.current =
      subsystemNavigationRequestId;
    resetSearch();
    clearSelection();
  }, [clearSelection, resetSearch, subsystemNavigationRequestId]);

  // Handle screenshot function registration - directly register with passed registry
  const handleScreenshotReady = (
    screenshotFn: () => Promise<string | null>,
  ) => {
    screenshotRegistry.set(projectId, screenshotFn);
    logger.verbose('Screenshot function registered', {
      action: 'register_screenshot',
      component: 'GraphDesigner',
      projectId,
    });
  };

  // Search handlers
  const buildHighlights = useCallback(
    (activeId: string | undefined): SearchHighlights => ({
      activeId,
      containsMatchNodeIds: computeContainsMatchIds(
        matchingNodes,
        collapsedSubgraphs,
      ),
      highlightedIds: matchingNodes.map((m) => m.nodeId),
    }),
    [collapsedSubgraphs, matchingNodes],
  );

  const handleSearch = useCallback(
    (term: string) => {
      if (!term.trim() || !levelView) {
        resetSearch();
        clearSelection();
        return;
      }
      setHasSearched(true);
      const matches = searchLevelView(levelView, term);
      setMatchingNodes(matches);
      setCurrentMatchIndex(0);
      const highlights: SearchHighlights = {
        activeId: matches[0]?.nodeId,
        containsMatchNodeIds: computeContainsMatchIds(
          matches,
          collapsedSubgraphs,
        ),
        highlightedIds: matches.map((m) => m.nodeId),
      };
      setSearchHighlights(highlights);
      setSearchHighlight(
        highlights.highlightedIds,
        highlights.activeId ?? null,
      );
    },
    [
      clearSelection,
      collapsedSubgraphs,
      levelView,
      resetSearch,
      setSearchHighlight,
    ],
  );

  const handleSearchNext = useCallback(() => {
    if (matchingNodes.length === 0) {
      return;
    }
    const nextIndex = (currentMatchIndex + 1) % matchingNodes.length;
    setCurrentMatchIndex(nextIndex);
    const highlights = buildHighlights(matchingNodes[nextIndex].nodeId);
    setSearchHighlights(highlights);
    setSearchHighlight(highlights.highlightedIds, highlights.activeId ?? null);
  }, [buildHighlights, currentMatchIndex, matchingNodes, setSearchHighlight]);

  const handleSearchPrevious = useCallback(() => {
    if (matchingNodes.length === 0) {
      return;
    }
    const prevIndex =
      (currentMatchIndex - 1 + matchingNodes.length) % matchingNodes.length;
    setCurrentMatchIndex(prevIndex);
    const highlights = buildHighlights(matchingNodes[prevIndex].nodeId);
    setSearchHighlights(highlights);
    setSearchHighlight(highlights.highlightedIds, highlights.activeId ?? null);
  }, [buildHighlights, currentMatchIndex, matchingNodes, setSearchHighlight]);

  const handleSearchClose = useCallback(() => {
    setSearchVisible(false);
    resetSearch();
    clearSelection();
    // Blur the active element so the hidden input does not retain focus.
    (document.activeElement as HTMLElement)?.blur();
  }, [clearSelection, resetSearch, setSearchVisible]);

  // Cleanup screenshot registration on unmount
  useEffect(() => {
    return () => {
      screenshotRegistry.delete(projectId);
      logger.verbose('Screenshot function unregistered', {
        action: 'unregister_screenshot',
        component: 'GraphDesigner',
        projectId,
      });
    };
  }, [projectId, screenshotRegistry]);

  // Effect — load module definitions once, needed to resolve enable overlays
  useEffect(() => {
    if (moduleListStatus === 'uninitialized') {
      void loadModuleList();
    }
  }, [moduleListStatus, loadModuleList]);

  useEffect(() => {
    if (subgraphListStatus === 'uninitialized') {
      void loadSubgraphList();
    }
  }, [subgraphListStatus, loadSubgraphList]);

  // Effect A — trigger load when selection changes
  useEffect(() => {
    resetSearch();
    clearLevelView();
    setCollapseByLevel({});
    positionOverridesByLevelRef.current = {};
    setPositionOverridesByLevel({});
    setParentSizesByLevel({});
    setViewportByLevel({});
    // Resets the level tracker so reselecting the same usecases after deselecting still counts as a fresh load, not a same-level mutation.
    appliedLevelSignatureRef.current = undefined;
    if (selectedUsecases.length === 0) {
      setSubsystemData([]);
      initializeEmptyGraphData();
      return;
    }
    if (selectedUsecaseSystemIds.length > 0) {
      void loadGraphData(selectedUsecaseSystemIds, {
        filterBySubsystem: filterComponentsBySubsystem,
      });
    }
  }, [
    selectedUsecases,
    selectedUsecaseSystemIds,
    resolvedData,
    clearLevelView,
    filterComponentsBySubsystem,
    initializeEmptyGraphData,
    loadGraphData,
    resetSearch,
    setSubsystemData,
  ]);

  // Effect B — build LevelView when graphData is ready or the port
  // visibility mode changes. Filtering runs before layoutLevelView so ELK
  // sizes/packs modules, containers, and subgraphs around the ports that
  // will actually be visible, instead of the full port count.
  useEffect(() => {
    if (graphDataStatus !== 'ready' || !graphData) {
      return;
    }
    const gen = ++layoutGenerationRef.current;
    const levelId = activeSubsystemId
      ? `subsystem:${activeSubsystemId}`
      : selectedUsecases.join(',');
    const unpositioned = activeSubsystemId
      ? buildSubsystemLevelViewFromGraphData(
          graphData,
          activeSubsystemId,
          levelId,
          {simplifySubsystems},
        )
      : buildLevelViewFromGraphData(graphData, levelId, {
          simplifySubsystems,
        });
    if (!unpositioned) {
      return;
    }
    const filtered = applyPortVisibility(
      unpositioned,
      effectivePortVisibilityMode,
    );
    if (!graphDataHasContent(graphData)) {
      setLevelView(filtered);
      return;
    }
    void layoutLevelView(filtered).then((lv) => {
      if (layoutGenerationRef.current === gen) {
        setLevelView(lv);
      }
    });
  }, [
    graphDataStatus,
    graphData,
    selectedUsecases,
    setLevelView,
    effectivePortVisibilityMode,
    activeSubsystemId,
    simplifySubsystems,
  ]);

  // Side nav > View > Auto Align Graphs re-runs the layout on the active graph.
  const handleAutoAlignGraphs = useCallback(() => {
    const current = store.getState().levelView;
    if (!current) {
      return;
    }
    const {levelId: activeLevelId} = current;
    setPositionOverridesByLevel((p) => ({...p, [activeLevelId]: {}}));
    setParentSizesByLevel((p) => ({...p, [activeLevelId]: {}}));
    void layoutLevelView(current).then(setLevelView);
  }, [setLevelView, store]);

  // Effect — proactively fetch enable-parameter values so canvas enable
  // overlays reflect real state without opening a module data tab
  // (design.md §21.8). Gated on both graph data and module definitions being
  // ready — syncEnableOverlays uses moduleDefinitionsBySystemId to identify
  // enable-capable modules, so running before definitions load silently
  // skips every module and never retries. Safe to re-run because
  // syncEnableOverlays is idempotent per resolved CKV.
  useEffect(() => {
    if (
      graphDataStatus !== 'ready' ||
      !graphData ||
      moduleListStatus !== 'ready'
    ) {
      return;
    }
    syncEnableOverlays();
  }, [graphDataStatus, graphData, moduleListStatus, syncEnableOverlays]);

  // Side nav implementation
  const hasSelection = (graph.modules?.length ?? 0) > 0;
  const hasLoadedGraphContent = graphDataHasContent(graphData);
  const canUndoRedo = false; // TODO: Support undo/redo stack

  const subgraphList = useGraphDesignerStoreShallow((s) => s.subgraphList);

  const {close, open, state} = usePortConnectionsInfo(projectId);

  // TODO: wire these to the manual-usecase store once it exists.
  const handleAddToManualUsecase = useCallback((subgraphId: number) => {
    void subgraphId;
  }, []);
  const handleRemoveFromManualUsecase = useCallback((subgraphId: number) => {
    void subgraphId;
  }, []);

  const contextMenu = useMemo<VisualizerContextMenuConfig>(() => {
    const baseContextMenu = buildContextMenuConfig(store.getState, {
      onAddToManualUsecase: handleAddToManualUsecase,
      onRemoveFromManualUsecase: handleRemoveFromManualUsecase,
      onRequestMoveToSubsystem: setMoveNodeId,
      subsystemScoped: filterComponentsBySubsystem,
    });
    return {
      getItems: (target: ContextMenuTarget) => {
        const baseItems = baseContextMenu.getItems(target);
        if (target.kind !== 'port') {
          return baseItems;
        }
        const activeLinks = target.port.activeLinks ?? 0;
        const totalLinks = target.port.totalLinks ?? 0;
        if (activeLinks >= totalLinks) {
          return baseItems;
        }
        return [
          ...baseItems,
          {id: 'show-all-connections', label: 'Show all connections'},
        ];
      },
      onAction: (actionId: string, target: ContextMenuTarget) => {
        if (actionId === 'show-all-connections' && target.kind === 'port') {
          open(target.nodeId, target.port);
          return;
        }
        return baseContextMenu.onAction(actionId, target);
      },
    };
  }, [
    filterComponentsBySubsystem,
    handleAddToManualUsecase,
    handleRemoveFromManualUsecase,
    open,
    setMoveNodeId,
    store,
  ]);

  const handleMoveToSubsystem = useCallback(
    async (destinationId: string) => {
      if (moveNodeId === null) {
        return;
      }
      setIsMoving(true);
      try {
        const moved = await store
          .getState()
          .moveToSubsystem(
            store.getState,
            moveNodeId,
            toMoveDestination(destinationId),
          );
        // Keep the dialog open on failure so the selection isn't lost.
        if (moved) {
          setMoveNodeId(null);
        }
      } catch (error) {
        // withMutationLock throws if another mutation is already running.
        logger.warn('Move to subsystem aborted', {
          error: error instanceof Error ? error.message : String(error),
        });
        showToast(
          'Another change is in progress. Try again shortly.',
          'danger',
        );
      } finally {
        setIsMoving(false);
      }
    },
    [moveNodeId, store],
  );

  const isPortConnectionsPopupOpen =
    state.status === 'loading-modules' ||
    state.status === 'ready' ||
    state.status === 'error';

  const subgraphBySystemId = useMemo(
    () => new Map(subgraphList.map((sg) => [sg.systemId, sg])),
    [subgraphList],
  );

  const resolveSubgraphDisplay = useCallback(
    (subgraphSystemId: string) =>
      String(
        subgraphBySystemId.get(subgraphSystemId)?.naturalId ?? subgraphSystemId,
      ),
    [subgraphBySystemId],
  );

  const handleAddUsecases = useCallback(
    (usecases: UsecaseDto[]) => {
      const formatted = usecases.map((usecase) =>
        formatUsecaseName(usecase, namePreference),
      );
      setSelectedUsecases([...new Set([...selectedUsecases, ...formatted])]);
    },
    [namePreference, selectedUsecases, setSelectedUsecases],
  );

  const handleNavigateUsecases = useCallback(
    (usecases: UsecaseDto[]) => {
      setSelectedUsecases(
        usecases.map((usecase) => formatUsecaseName(usecase, namePreference)),
      );
    },
    [namePreference, setSelectedUsecases],
  );

  const handleModuleDoubleClick = useCallback(
    async (nodeId: string, nodeKind: NodeKind, label: string) => {
      if (nodeKind !== NODE_KIND.MODULE) {
        return;
      }
      const layout = useProjectLayoutStore.getState();
      const existingTabId = store.getState().moduleOpenTabs[nodeId];
      if (existingTabId) {
        layout.setActiveProjectTab(projectId, existingTabId);
        return;
      }
      if (pendingModuleOpensRef.current.has(nodeId)) {
        return;
      }
      pendingModuleOpensRef.current.add(nodeId);
      try {
        const ok = await store.getState().queryModuleData(nodeId, label);
        if (!ok) {
          return;
        }
        const existingAfterFetch = store.getState().moduleOpenTabs[nodeId];
        if (existingAfterFetch) {
          layout.setActiveProjectTab(projectId, existingAfterFetch);
          return;
        }
        const moduleDataTabRef = createRef<ModuleDataTabHandle>();
        moduleDataTabRefs.current.set(nodeId, moduleDataTabRef);
        const naturalId =
          store.getState().graphData?.moduleInstances[nodeId]?.naturalId;
        const title =
          typeof naturalId === 'number'
            ? `${label} (${formatModuleInstanceId(naturalId)})`
            : label;
        const tab = tabLayoutService.createProjectTab(
          title,
          <GraphDesignerStoreContext.Provider value={store}>
            <ModuleDataTab ref={moduleDataTabRef} moduleInstanceId={nodeId} />
          </GraphDesignerStoreContext.Provider>,
          () => moduleDataTabRef.current?.confirmClose() ?? true,
          () => {
            moduleDataTabRefs.current.delete(nodeId);
            store.getState().setModuleOpenTab(nodeId, null);
            store.getState().clearModuleData(nodeId);
          },
        );
        store.getState().setModuleOpenTab(nodeId, tab.id);
        layout.setActiveProjectTab(projectId, tab.id);
      } finally {
        pendingModuleOpensRef.current.delete(nodeId);
      }
    },
    [projectId, store],
  );

  const handleNodeDoubleClick = useCallback(
    (nodeId: string, nodeKind: NodeKind, label: string) => {
      if (nodeKind === NODE_KIND.SUBSYSTEM) {
        if (nodeId === store.getState().activeSubsystemId) {
          return;
        }
        if (!store.getState().graphData?.subsystems[nodeId]) {
          return;
        }
        navigateToSubsystem(nodeId);
        return;
      }
      if (nodeKind === NODE_KIND.MODULE) {
        void handleModuleDoubleClick(nodeId, nodeKind, label);
      }
    },
    [handleModuleDoubleClick, navigateToSubsystem, store],
  );

  const applyCreatedModuleDropPosition = useCallback(
    (createdModuleId: string, position: XY, placement: ModuleDropPlacement) => {
      const previous = positionOverridesByLevelRef.current;
      const previousLevelOverrides = previous[levelId] ?? {};
      const overrides = buildDroppedModulePlacementOverrides(
        store.getState().graphData,
        graph,
        previousLevelOverrides,
        createdModuleId,
        position,
        placement,
      );
      if (Object.keys(overrides.positions).length === 0) {
        return;
      }
      const next = {
        ...previous,
        [levelId]: {...previousLevelOverrides, ...overrides.positions},
      };
      positionOverridesByLevelRef.current = next;
      setPositionOverridesByLevel(next);
      if (Object.keys(overrides.sizes).length > 0) {
        setParentSizesByLevel((sizesByLevel) => ({
          ...sizesByLevel,
          [levelId]: {
            ...(sizesByLevel[levelId] ?? {}),
            ...overrides.sizes,
          },
        }));
      }
    },
    [graph, levelId, store],
  );

  const applyPlacedSubgraphDropPosition = useCallback(
    (subgraphId: string, position: XY) => {
      const previous = positionOverridesByLevelRef.current;
      const next = {
        ...previous,
        [levelId]: {
          ...(previous[levelId] ?? {}),
          [subgraphNodeId(subgraphId)]: position,
          [subgraphProxyNodeId(subgraphId)]: position,
        },
      };
      positionOverridesByLevelRef.current = next;
      setPositionOverridesByLevel(next);
    },
    [levelId],
  );

  const collapsePlacedSubgraphIfNeeded = useCallback(
    (subgraphId: string) => {
      if (preferences.visualization.expandSubgraphs) {
        return;
      }
      const parsedSubgraphId = parseSubgraphSystemId(subgraphId);
      if (parsedSubgraphId === null) {
        return;
      }
      setCollapseByLevel((previous) => ({
        ...previous,
        [levelId]: new Set(previous[levelId] ?? []).add(parsedSubgraphId),
      }));
    },
    [levelId, preferences.visualization.expandSubgraphs],
  );

  const handleNodesDeleted = useCallback(
    ({nodeIds}: {nodeIds: string[]}) =>
      deleteSelection(store.getState, nodeIds, []),
    [store],
  );

  const handleEdgesDeleted = useCallback(
    ({edgeIds}: {edgeIds: string[]}) =>
      deleteSelection(store.getState, [], edgeIds),
    [store],
  );
  const eventHandlers = useMemo(
    () => ({
      onEdgeConnected: (payload: EdgeConnectPayload) => {
        if (payload.edgeKind !== 'data' && payload.edgeKind !== 'control') {
          return;
        }
        // Catches the case where another connect is already in flight, so it shows a toast instead of an unhandled rejection.
        linkOperations
          .connectPorts(
            store.getState,
            payload.sourceNodeId,
            payload.sourcePortId,
            payload.targetNodeId,
            payload.targetPortId,
            payload.edgeKind,
            payload.edgeMode,
          )
          .catch(() => {
            showToast(
              'Please wait for the current operation to finish',
              'danger',
            );
          });
      },
      onEdgesDeleted: handleEdgesDeleted,
      onNodeDoubleClick: handleNodeDoubleClick,
      onNodeDragEnd: ({
        correctedPositions,
        nodeId,
        position,
        resizedParents,
      }: {
        correctedPositions?: Record<string, XY>;
        nodeId: string;
        position: XY;
        resizedParents?: Record<string, {height: number; width: number}>;
      }) => {
        setPositionOverridesByLevel((p) => ({
          ...p,
          [levelId]: {
            ...(p[levelId] ?? {}),
            ...(correctedPositions ?? {}),
            [nodeId]: position,
          },
        }));
        if (resizedParents) {
          setParentSizesByLevel((p) => ({
            ...p,
            [levelId]: {...(p[levelId] ?? {}), ...resizedParents},
          }));
        }
      },
      onNodeDropped: ({
        dropData,
        position,
        targetContainerId,
        targetSubgraphId,
      }: NodeDropPayload) => {
        const modulePayload = parseModuleDropPayload(dropData);
        if (modulePayload) {
          const {moduleDefinitionSystemId, processorSystemId} = modulePayload;
          if (targetContainerId && !targetSubgraphId) {
            logger.warn(
              'GraphDesigner: module drop on container missing parent subgraph id',
              {
                action: 'drop_module',
                component: 'GraphDesigner',
              },
            );
            return;
          }
          if (targetContainerId && targetSubgraphId) {
            void store
              .getState()
              .addModuleToContainer(
                store.getState,
                targetContainerId,
                targetSubgraphId,
                moduleDefinitionSystemId,
                position,
                processorSystemId,
              )
              .then((createdModuleId) => {
                if (createdModuleId) {
                  applyCreatedModuleDropPosition(
                    createdModuleId,
                    position,
                    'container',
                  );
                }
              });
          } else if (targetSubgraphId) {
            void store
              .getState()
              .addModuleToSubgraphNoContainer(
                store.getState,
                targetSubgraphId,
                moduleDefinitionSystemId,
                position,
                processorSystemId,
              )
              .then((createdModuleId) => {
                if (createdModuleId) {
                  applyCreatedModuleDropPosition(
                    createdModuleId,
                    position,
                    'subgraph',
                  );
                }
              });
          } else {
            void store
              .getState()
              .addModuleToEmptyCanvas(
                store.getState,
                moduleDefinitionSystemId,
                position,
                processorSystemId,
              )
              .then((createdModuleId) => {
                if (createdModuleId) {
                  applyCreatedModuleDropPosition(
                    createdModuleId,
                    position,
                    'empty-canvas',
                  );
                }
              });
          }
          return;
        }

        const subgraphPayload = parseSubgraphDropPayload(dropData);
        if (subgraphPayload) {
          void store
            .getState()
            .placeSubgraphFromPalette(
              store.getState,
              subgraphPayload.subgraphId,
              position,
            )
            .then((wasPlaced) => {
              if (wasPlaced) {
                applyPlacedSubgraphDropPosition(
                  subgraphPayload.subgraphId,
                  position,
                );
                collapsePlacedSubgraphIfNeeded(subgraphPayload.subgraphId);
              }
            });
        }
      },
      onNodesDeleted: handleNodesDeleted,
      onSelectionChange: ({
        selectedEdges,
        selectedNodes,
      }: SelectionChangePayload) => {
        setSelection(selectedNodes, selectedEdges);
        setKeyConfiguratorSelectedItems(
          mapSelectedNodesToConfigurationItems(selectedNodes, graphData),
        );
      },
      onSubgraphCollapse: (subgraphId: number) => {
        setCollapseByLevel((prev) => ({
          ...prev,
          [levelId]: new Set(prev[levelId] ?? []).add(subgraphId),
        }));
      },
      onSubgraphExpand: (subgraphId: number) => {
        setCollapseByLevel((prev) => {
          const next = new Set(prev[levelId] ?? []);
          next.delete(subgraphId);
          return {...prev, [levelId]: next};
        });
        // Position overrides keyed to the re-exposed nodes are intentionally
        // retained so that modules dragged before collapse snap back to where
        // the user left them rather than reverting to ELK defaults.
      },
      onViewportChange: (viewport: ViewportState) => {
        setViewportByLevel((p) => ({...p, [levelId]: viewport}));
      },
    }),
    [
      applyCreatedModuleDropPosition,
      applyPlacedSubgraphDropPosition,
      collapsePlacedSubgraphIfNeeded,
      handleEdgesDeleted,
      handleNodeDoubleClick,
      handleNodesDeleted,
      graphData,
      levelId,
      setSelection,
      setKeyConfiguratorSelectedItems,
      linkOperations,
      store,
    ],
  );

  const displayOptionsContent = useMemo(
    () => (
      <DisplayOptionsPopover
        isEditable={isEditable}
        preferences={preferences}
        projectId={projectId}
        updatePreference={updatePreference}
      />
    ),
    [isEditable, preferences, projectId, updatePreference],
  );

  const visualizerRendering = useMemo(
    () => ({
      nodeDisplayConfig: {
        showContainerId: isDetailedView && showContainerIds,
        showModuleInstanceId: isDetailedView && showModuleInstanceIds,
        showSubgraphId: isDetailedView && showSubgraphIds,
      },
      renderNodeContent,
    }),
    [isDetailedView, showContainerIds, showModuleInstanceIds, showSubgraphIds],
  );

  const sideNavItems = useMemo(
    () => [
      // Edit group
      {
        disabled: !canUndoRedo,
        group: 'Edit',
        icon: Undo,
        id: 'undo',
        label: 'Undo',
        shortcut: 'Ctrl+Z',
      },
      {
        disabled: !canUndoRedo,
        group: 'Edit',
        icon: Redo,
        id: 'redo',
        label: 'Redo',
        shortcut: 'Ctrl+Y',
      },
      {
        disabled: !hasSelection,
        group: 'Edit',
        icon: Clipboard,
        id: 'copy',
        label: 'Copy',
        shortcut: 'Ctrl+C',
        tooltip: !hasSelection ? 'Copy is currently unavailable' : '',
      },
      {
        group: 'Edit',
        icon: Type,
        id: 'paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
      },
      {
        group: 'Edit',
        icon: Search,
        id: 'search',
        label: 'Search',
        shortcut: 'Ctrl+F',
      },
      // Tools group
      {
        group: 'Tools',
        icon: Package,
        id: 'module-manager',
        label: 'Module Manager',
      },
      {
        group: 'Tools',
        icon: Cpu,
        id: 'driver-module',
        label: 'Driver Module',
      },
      {
        group: 'Tools',
        icon: FileText,
        id: 'view-arc-log',
        label: 'View ARC Log',
      },
      {
        children: [
          {
            icon: Edit,
            id: 'view-edit-definitions',
            label: 'View/Edit Definitions',
          },
          {
            icon: Download,
            id: 'import-h2xml',
            label: 'Import Definitions',
          },
          {
            icon: Upload,
            id: 'export-definitions',
            label: 'Export Definitions',
          },
        ],
        group: 'Tools',
        icon: Wand2,
        id: 'discovery-wizard',
        label: 'Discovery Wizard',
      },
      // View group
      {
        group: 'View',
        icon: SlidersHorizontal,
        id: 'display-options',
        label: 'Display Options',
        popoverContent: displayOptionsContent,
        tooltip: 'Display Options',
      },
      {
        disabled: !hasLoadedGraphContent,
        group: 'View',
        icon: LayoutFreeform,
        id: 'auto-align-graphs',
        label: 'Auto Align Graphs',
      },
    ],
    [hasSelection, hasLoadedGraphContent, canUndoRedo, displayOptionsContent],
  );

  const sideNavHandlers = useMemo(
    () => ({
      'auto-align-graphs': handleAutoAlignGraphs,
      copy: () => {
        logger.info('Copy action triggered', {
          action: 'copy',
          component: 'GraphDesigner',
        });
        showToast('Copied to clipboard', 'success');
      },
      'driver-module': () => {
        logger.info('Driver Module action triggered', {
          action: 'driver_module',
          component: 'GraphDesigner',
        });
        showToast('Opening Driver Module', 'info');
      },
      'export-definitions': () => {
        logger.info('Export definitions action triggered', {
          action: 'export_definitions',
          component: 'GraphDesigner',
        });
        showToast('Exporting definitions to header', 'info');
      },
      'import-h2xml': () => {
        logger.info('Import H2XML action triggered', {
          action: 'import_h2xml',
          component: 'GraphDesigner',
        });
        showToast('Opening H2XML import dialog', 'info');
      },
      'module-manager': () => {
        logger.info('Module Manager action triggered', {
          action: 'module_manager',
          component: 'GraphDesigner',
        });
        showToast('Opening Module Manager', 'info');
      },
      paste: () => {
        logger.info('Paste action triggered', {
          action: 'paste',
          component: 'GraphDesigner',
        });
        showToast('Pasted from clipboard', 'success');
      },
      redo: () => {
        logger.info('Redo action triggered', {
          action: 'redo',
          component: 'GraphDesigner',
        });
        showToast('Redo', 'info');
      },
      search: () => {
        openSearch();
      },
      undo: () => {
        logger.info('Undo action triggered', {
          action: 'undo',
          component: 'GraphDesigner',
        });
        showToast('Undo', 'info');
      },
      'view-arc-log': () => {
        logger.info('View ARC Log action triggered', {
          action: 'view_arc_log',
          component: 'GraphDesigner',
        });
        showToast('Opening ARC Log', 'info');
      },
      'view-edit-definitions': () => {
        logger.info('View/Edit Definitions action triggered', {
          action: 'view_edit_definitions',
          component: 'GraphDesigner',
        });
        showToast('Opening View/Edit Definitions', 'info');
      },
    }),
    [handleAutoAlignGraphs, openSearch],
  );

  const sideNavShortcuts = useMemo(() => {
    const shortcuts: Record<string, () => void> = {
      'Ctrl+f': () => {
        openSearch();
      },
      'Ctrl+v': () => {
        logger.info('Paste shortcut triggered', {
          action: 'paste',
          component: 'GraphDesigner',
        });
        showToast('Pasted from clipboard', 'success');
      },
    };

    // Only add Copy shortcut if there's a selection
    if (hasSelection) {
      shortcuts['Ctrl+c'] = () => {
        logger.info('Copy shortcut triggered', {
          action: 'copy',
          component: 'GraphDesigner',
        });
        showToast('Copied to clipboard', 'success');
      };
    }

    // Only add Undo/Redo shortcuts if canUndoRedo is true
    if (canUndoRedo) {
      shortcuts['Ctrl+z'] = () => {
        logger.info('Undo shortcut triggered', {
          action: 'undo',
          component: 'GraphDesigner',
        });
        showToast('Undo', 'info');
      };
      shortcuts['Ctrl+y'] = () => {
        logger.info('Redo shortcut triggered', {
          action: 'redo',
          component: 'GraphDesigner',
        });
        showToast('Redo', 'info');
      };
    }

    return shortcuts;
  }, [hasSelection, canUndoRedo, openSearch]);

  const sideNav = useSideNav(sideNavItems, sideNavHandlers, sideNavShortcuts);

  // Register side nav with provider
  useRegisterSideNav(tabId, sideNav);

  return (
    <div className="flex h-full flex-col">
      {isExpandCollapsePending &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-surface-overlay) 50%, transparent)',
            }}
          >
            <div className="bg-raised rounded-lg p-8 shadow-xl">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div className="text-neutral-primary mb-2 text-lg font-semibold">
                  {expandCollapseLabel}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {state.status === 'loading-links' &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-surface-overlay) 50%, transparent)',
            }}
          >
            <div className="bg-raised rounded-lg p-8 shadow-xl">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div className="text-neutral-primary mb-2 text-lg font-semibold">
                  Loading connections…
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <PortConnectionsInfoPopup
        isReadonly={!isEditable}
        onAdd={handleAddUsecases}
        onClose={close}
        onNavigate={handleNavigateUsecases}
        open={isPortConnectionsPopupOpen}
        resolveSubgraphDisplay={resolveSubgraphDisplay}
        state={state}
      />
      {/* Usecase Selection Control at the top */}
      <div className="bg-primary border-neutral-02 shrink-0 border-b p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <UsecaseSelectionControl
              disabled={isSystemWorkflow}
              lockSelected={isEditable}
              onSelectedUsecasesChange={setSelectedUsecases}
              projectId={projectId}
              selectAll={isSystemWorkflow && !isWorkflowLoading}
              selectedUsecases={selectedUsecases}
              usecaseData={resolvedUsecaseData}
            />
          </div>
          <ApplyDiscardControls
            onApplyUsecaseChanges={handleApplyUsecaseChanges}
            projectId={projectId}
            selectedUsecaseSystemIds={selectedUsecaseSystemIds}
          />
        </div>
      </div>

      {/* Graph Visualizer below */}
      <div
        className="bg-primary relative flex-1 overflow-hidden"
        data-project-id={projectId}
      >
        {breadcrumbItems.length > 0 && (
          <div className="absolute top-[5px] left-3 z-10 max-w-[calc(100%-24px)]">
            <ArcBreadcrumbs items={breadcrumbItems} />
          </div>
        )}

        {/* Search overlay – floats above the graph canvas at top-right */}
        <div
          aria-hidden={!isSearchVisible}
          className={`absolute top-1.25 right-3 z-10 w-95 max-w-[calc(100%-24px)] transition-[opacity,transform] duration-300 ease-in-out ${
            isSearchVisible
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          <SearchComponent
            currentMatch={matchCount > 0 ? currentMatchIndex + 1 : 0}
            focusTrigger={searchFocusTrigger}
            history={history}
            onAddToHistory={addToHistory}
            onClose={handleSearchClose}
            onNext={handleSearchNext}
            onPrevious={handleSearchPrevious}
            onSearch={handleSearch}
            onSearchTermChange={setSearchTerm}
            searchTerm={currentSearchTerm}
            totalMatches={hasSearched ? matchCount : undefined}
          />
        </div>

        {graphDataStatus === 'loading' ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-neutral-primary mb-2 text-lg font-semibold">
                Loading graph...
              </div>
              <div className="text-neutral-secondary text-sm">
                Fetching usecase components
              </div>
            </div>
          </div>
        ) : graphDataStatus === 'error' ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-support-danger mb-2 text-lg font-semibold">
                Error loading graph
              </div>
              <div className="text-neutral-secondary mt-1 text-sm">
                {graphDataError ?? 'Unknown error'}
              </div>
            </div>
          </div>
        ) : selectedUsecases.length === 0 && !hasLoadedGraphContent ? (
          <>
            <UsecaseVisualizer
              contextMenu={contextMenu}
              eventHandlers={eventHandlers}
              focusNodeRequest={focusNodeRequest}
              graph={graph}
              initialViewport={viewportByLevel['']}
              mode={
                isEditable ? VISUALIZER_MODE.EDIT : VISUALIZER_MODE.READONLY
              }
              onFocusNodeRequestHandled={clearNodeFocusRequest}
              onScreenshotApiReady={handleScreenshotReady}
              rendering={visualizerRendering}
              searchHighlights={searchHighlights}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-neutral-primary mb-2 text-lg font-semibold">
                  No usecases selected
                </div>
                <div className="text-neutral-secondary text-sm">
                  Select usecases from the control above to view the graph
                </div>
              </div>
            </div>
          </>
        ) : levelView ? (
          <UsecaseVisualizer
            contextMenu={contextMenu}
            eventHandlers={eventHandlers}
            focusNodeRequest={focusNodeRequest}
            graph={graph}
            initialViewport={viewportByLevel[levelId]}
            mode={isEditable ? VISUALIZER_MODE.EDIT : VISUALIZER_MODE.READONLY}
            onFocusNodeRequestHandled={clearNodeFocusRequest}
            onScreenshotApiReady={handleScreenshotReady}
            rendering={visualizerRendering}
            searchHighlights={searchHighlights}
          />
        ) : null}
      </div>
      <MoveToSubsystemDialog
        currentParentId={
          moveNodeId === null
            ? null
            : containingSubsystemIdOf(graphData, moveNodeId)
        }
        isMoving={isMoving}
        movingNodeId={moveNodeId}
        onCancel={() => setMoveNodeId(null)}
        onConfirm={(destinationId) => {
          void handleMoveToSubsystem(destinationId);
        }}
        open={moveNodeId !== null}
        tree={subsystemPickTree}
      />
    </div>
  );
};

export default GraphDesigner;
