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
import {
  getSystemIdsFromFormattedUsecases,
  type UsecaseCategory,
} from '~entities/usecases';
import {
  ApplyDiscardControls,
  GraphDesignerStoreContext,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {SearchComponent} from '~features/search-component';
import {
  UsecaseSelectionControl,
  useWorkflowUsecaseData,
} from '~features/usecase-selection';
import {
  type SearchHighlights,
  UsecaseVisualizer,
  type ViewportState,
  type XY,
} from '~features/usecase-visualizer';
import {useUserPreferences} from '~shared/config/hooks';
import {WORKFLOW_TYPES} from '~shared/config/user-preferences-types';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {useRegisterSideNav, useSideNav} from '~shared/lib/side-nav';
import {useProjectLayoutStore} from '~shared/store';
import {
  ModuleDataTab,
  type ModuleDataTabHandle,
} from '~widgets/module-data-tab';
import {tabLayoutService} from '~widgets/project-layout/project-layout-manager';

import {applyCollapses} from '../lib/apply-collapses';
import {applyPortVisibility} from '../lib/apply-port-visibility';
import {applyPositionOverrides} from '../lib/apply-position-overrides';
import {
  computeContainsMatchIds,
  searchLevelView,
  type SearchMatch,
} from '../lib/graph-search';
import {buildLevelViewFromGraphData} from '../lib/level-view-adapter';
import {layoutLevelView} from '../lib/level-view-layout';
import {renderNodeContent} from '../lib/render-node-content';
import {collapseSetForLevel} from '../lib/subgraph-collapse';

import {DisplayOptionsPopover} from './display-options-popover';

interface GraphDesignerProps {
  projectId: string;
  screenshotRegistry: Map<string, () => Promise<string | null>>;
  tabId?: string;
  usecaseData: UsecaseCategory[];
}

const EMPTY_SET: ReadonlySet<number> = new Set<number>();

const GraphDesigner: React.FC<GraphDesignerProps> = ({
  projectId,
  screenshotRegistry,
  tabId,
  usecaseData: initialUsecaseData,
}) => {
  // Get selected usecases from tab store
  const selectedUsecases = useGraphDesignerStoreShallow(
    (state) => state.selectedUsecases,
  );
  const setSelectedUsecases = useGraphDesignerStoreShallow(
    (state) => state.setSelectedUsecases,
  );

  const usecaseData = initialUsecaseData;

  const {preferences, updatePreference} = useUserPreferences();
  const effectivePortVisibilityMode =
    preferences.visualization.viewMode === 'detailed'
      ? preferences.display.portVisibilityMode
      : 'active';
  const {workflowLevel, workflowType} = preferences.usecases;

  const {isLoading: isWorkflowLoading, resolvedData} = useWorkflowUsecaseData(
    projectId,
    workflowType,
    workflowLevel,
    usecaseData,
  );

  // Derived flags for UsecaseSelectionControl
  const isSystemWorkflow = workflowType === WORKFLOW_TYPES.SYSTEM;

  // Graph data from store
  const graphData = useGraphDesignerStoreShallow((s) => s.graphData);
  const graphDataError = useGraphDesignerStoreShallow((s) => s.graphDataError);
  const graphDataStatus = useGraphDesignerStoreShallow(
    (s) => s.graphDataStatus,
  );
  const loadGraphData = useGraphDesignerStoreShallow((s) => s.loadGraphData);
  const levelView = useGraphDesignerStoreShallow((s) => s.levelView);
  const setLevelView = useGraphDesignerStoreShallow((s) => s.setLevelView);
  const clearLevelView = useGraphDesignerStoreShallow((s) => s.clearLevelView);
  const moduleListStatus = useGraphDesignerStoreShallow(
    (s) => s.moduleListStatus,
  );
  const loadModuleList = useGraphDesignerStoreShallow((s) => s.loadModuleList);

  // Store API for imperative action calls and provider value for new tabs.
  const store = useGraphDesignerStore();

  // Keyed by moduleId so the tab-close callback can reach the specific
  // ModuleDataTab instance's confirmClose() handle.
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
  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, XY>
  >({});
  const [parentSizes, setParentSizes] = useState<
    Record<string, {height: number; width: number}>
  >({});
  const [viewportByLevel, setViewportByLevel] = useState<
    Record<string, ViewportState>
  >({});

  const levelId = levelView?.levelId ?? '';
  const collapsedSubgraphs = (collapseByLevel[levelId] ??
    EMPTY_SET) as Set<number>;

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

  // Applies expandSubgraphs to the current level; overlay only on checkbox click.
  useEffect(() => {
    if (!levelView) {
      return;
    }
    const checkboxChanged =
      appliedExpandSubgraphsRef.current !==
      preferences.visualization.expandSubgraphs;
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

  const graph = useMemo<LevelView>(() => {
    if (!levelView) {
      return {levelId: ''};
    }
    const collapsed = applyCollapses(levelView, collapsedSubgraphs);
    return applyPositionOverrides(collapsed, positionOverrides, parentSizes);
  }, [levelView, collapsedSubgraphs, positionOverrides, parentSizes]);

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

  // Effect A — trigger load when selection changes
  useEffect(() => {
    resetSearch();
    clearLevelView();
    setCollapseByLevel({});
    setPositionOverrides({});
    setParentSizes({});
    setViewportByLevel({});
    if (selectedUsecases.length === 0) {
      return;
    }
    const systemIds = getSystemIdsFromFormattedUsecases(
      selectedUsecases,
      resolvedData,
    );
    if (systemIds.length > 0) {
      void loadGraphData(systemIds);
    }
  }, [
    selectedUsecases,
    resolvedData,
    clearLevelView,
    loadGraphData,
    resetSearch,
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
    const levelId = selectedUsecases.join(',');
    const unpositioned = buildLevelViewFromGraphData(graphData, levelId);
    const filtered = applyPortVisibility(
      unpositioned,
      effectivePortVisibilityMode,
    );
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
  ]);

  // Side nav implementation
  const hasSelection = (graph.modules?.length ?? 0) > 0;
  const canUndoRedo = false; // TODO: Support undo/redo stack

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
        // TODO: hardcodes selection to the first available CKV/TKV until the
        // subgraph-header CKV/TKV inheritance selector lands.
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
        const tab = tabLayoutService.createProjectTab(
          label,
          <GraphDesignerStoreContext.Provider value={store}>
            <ModuleDataTab ref={moduleDataTabRef} moduleId={nodeId} />
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

  const eventHandlers = useMemo(
    () => ({
      onNodeDoubleClick: handleModuleDoubleClick,
      onNodeDragEnd: ({
        nodeId,
        position,
        resizedParents,
      }: {
        nodeId: string;
        position: XY;
        resizedParents?: Record<string, {height: number; width: number}>;
      }) => {
        setPositionOverrides((p) => ({...p, [nodeId]: position}));
        if (resizedParents) {
          setParentSizes((p) => ({...p, ...resizedParents}));
        }
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
    [handleModuleDoubleClick, levelId],
  );

  const displayOptionsContent = useMemo(
    () => (
      <DisplayOptionsPopover
        preferences={preferences}
        projectId={projectId}
        updatePreference={updatePreference}
      />
    ),
    [preferences, projectId, updatePreference],
  );

  const visualizerRendering = useMemo(() => ({renderNodeContent}), []);

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
    ],
    [hasSelection, canUndoRedo, displayOptionsContent],
  );

  const sideNavHandlers = useMemo(
    () => ({
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
    [openSearch],
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
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-surface-overlay) 50%, transparent)',
            }}
          >
            <div
              className="rounded-lg p-8 shadow-xl"
              style={{backgroundColor: 'var(--color-surface-raised)'}}
            >
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div
                  className="mb-2 text-lg font-semibold"
                  style={{color: 'var(--color-text-neutral-primary)'}}
                >
                  {expandCollapseLabel}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Usecase Selection Control at the top */}
      <div
        className="flex-shrink-0 p-4"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderBottom: '1px solid var(--color-border-neutral-02)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <UsecaseSelectionControl
              disabled={isSystemWorkflow}
              onSelectedUsecasesChange={setSelectedUsecases}
              projectId={projectId}
              selectAll={isSystemWorkflow && !isWorkflowLoading}
              selectedUsecases={selectedUsecases}
              usecaseData={resolvedData}
            />
          </div>
          <ApplyDiscardControls projectId={projectId} />
        </div>
      </div>

      {/* Graph Visualizer below */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          position: 'relative',
        }}
      >
        {/* Search overlay – floats above the graph canvas at top-right */}
        <div
          className={`absolute right-3 top-[5px] z-10 w-[380px] max-w-[calc(100%-24px)] transition-[opacity,transform] duration-300 ease-in-out ${
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
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                Loading graph...
              </div>
              <div
                className="text-sm"
                style={{color: 'var(--color-text-neutral-secondary)'}}
              >
                Fetching usecase components
              </div>
            </div>
          </div>
        ) : graphDataStatus === 'error' ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: 'var(--color-border-support-danger)'}}
              >
                Error loading graph
              </div>
              <div
                className="mt-1 text-sm"
                style={{color: 'var(--color-text-neutral-secondary)'}}
              >
                {graphDataError ?? 'Unknown error'}
              </div>
            </div>
          </div>
        ) : selectedUsecases.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                No usecases selected
              </div>
              <div
                className="text-sm"
                style={{color: 'var(--color-text-neutral-secondary)'}}
              >
                Select usecases from the control above to view the graph
              </div>
            </div>
          </div>
        ) : levelView ? (
          <UsecaseVisualizer
            eventHandlers={eventHandlers}
            graph={graph}
            initialViewport={viewportByLevel[levelId]}
            onScreenshotApiReady={handleScreenshotReady}
            rendering={visualizerRendering}
            searchHighlights={searchHighlights}
          />
        ) : null}
      </div>
    </div>
  );
};

export default GraphDesigner;
