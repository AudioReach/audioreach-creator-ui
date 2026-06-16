/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

// Side-effect import: registers the graph-designer tab store factory with
// tabStoreRegistry so createTabStore('graph-designer') works when a project opens.
import '~features/graph-designer';

import {
  Clipboard,
  Copy,
  Cpu,
  Download,
  Edit,
  FileText,
  Package,
  Redo,
  Save,
  Search,
  Type,
  Undo,
  Upload,
  Wand2,
} from 'lucide-react';

import {getSystemIdsFromFormattedUsecases} from '~entities/usecases/model/usecase-utils';
import {useGraphDesignerStoreShallow} from '~features/graph-designer/model/graph-designer-store-context';
import {SearchComponent} from '~features/search-component';
import {
  type UsecaseCategory,
  UsecaseSelectionControl,
} from '~features/usecase-selection';
import {
  type SearchHighlights,
  UsecaseVisualizer,
} from '~features/usecase-visualizer';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {useRegisterSideNav, useSideNav} from '~shared/lib/side-nav';

import {searchGraphData} from '../lib/graph-search';
import {buildLevelViewFromGraphData} from '../lib/level-view-adapter';
import {layoutLevelView} from '../lib/level-view-layout';

interface GraphDesignerProps {
  projectGroupId: string;
  screenshotRegistry: Map<string, () => Promise<string | null>>;
  tabId?: string;
  usecaseData: UsecaseCategory[];
}

const GraphDesigner: React.FC<GraphDesignerProps> = ({
  projectGroupId,
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

  // Guards against stale layout results when selectedUsecases changes rapidly.
  const layoutGenerationRef = useRef(0);

  // Search state
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHighlights, setSearchHighlights] = useState<
    SearchHighlights | undefined
  >(undefined);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchCount = searchHighlights?.highlightedIds.length ?? 0;

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
    setSearchHighlights(undefined);
    setCurrentMatchIndex(0);
    clearSearchHighlight();
  }, [clearSearchHighlight]);

  // Handle screenshot function registration - directly register with passed registry
  const handleScreenshotReady = (
    screenshotFn: () => Promise<string | null>,
  ) => {
    screenshotRegistry.set(projectGroupId, screenshotFn);
    logger.verbose('Screenshot function registered', {
      action: 'register_screenshot',
      component: 'GraphDesigner',
      projectId: projectGroupId,
    });
  };

  // Search handlers
  const handleSearch = useCallback(
    (term: string) => {
      if (!term.trim() || !graphData) {
        resetSearch();
        clearSelection();
        return;
      }

      setHasSearched(true);
      const result = searchGraphData(graphData, term);
      setSearchHighlights(result);
      setCurrentMatchIndex(0);
      setSearchHighlight(result.highlightedIds, result.activeId ?? null);
    },
    [graphData, resetSearch, clearSelection, setSearchHighlight],
  );

  const handleSearchNext = useCallback(() => {
    if (!searchHighlights || searchHighlights.highlightedIds.length === 0) {
      return;
    }
    const nextIndex =
      (currentMatchIndex + 1) % searchHighlights.highlightedIds.length;
    setCurrentMatchIndex(nextIndex);
    const nextId = searchHighlights.highlightedIds[nextIndex];
    setSearchHighlights({...searchHighlights, activeId: nextId});
    setSearchHighlight(searchHighlights.highlightedIds, nextId);
  }, [searchHighlights, currentMatchIndex, setSearchHighlight]);

  const handleSearchPrevious = useCallback(() => {
    if (!searchHighlights || searchHighlights.highlightedIds.length === 0) {
      return;
    }
    const prevIndex =
      (currentMatchIndex - 1 + searchHighlights.highlightedIds.length) %
      searchHighlights.highlightedIds.length;
    setCurrentMatchIndex(prevIndex);
    const prevId = searchHighlights.highlightedIds[prevIndex];
    setSearchHighlights({...searchHighlights, activeId: prevId});
    setSearchHighlight(searchHighlights.highlightedIds, prevId);
  }, [searchHighlights, currentMatchIndex, setSearchHighlight]);

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
      screenshotRegistry.delete(projectGroupId);
      logger.verbose('Screenshot function unregistered', {
        action: 'unregister_screenshot',
        component: 'GraphDesigner',
        projectId: projectGroupId,
      });
    };
  }, [projectGroupId, screenshotRegistry]);

  // Effect A — trigger load when selection changes
  useEffect(() => {
    resetSearch();
    clearLevelView();
    if (selectedUsecases.length === 0) {
      return;
    }
    const systemIds = getSystemIdsFromFormattedUsecases(
      selectedUsecases,
      usecaseData,
    );
    if (systemIds.length > 0) {
      void loadGraphData(systemIds);
    }
  }, [
    selectedUsecases,
    usecaseData,
    clearLevelView,
    loadGraphData,
    resetSearch,
  ]);

  // Effect B — build LevelView when graphData is ready
  useEffect(() => {
    if (graphDataStatus !== 'ready' || !graphData || levelView !== null) {
      return;
    }
    const gen = ++layoutGenerationRef.current;
    const levelId = selectedUsecases.join(',');
    const unpositioned = buildLevelViewFromGraphData(graphData, levelId);
    void layoutLevelView(unpositioned).then((lv) => {
      if (layoutGenerationRef.current === gen) {
        setLevelView(lv);
      }
    });
  }, [graphDataStatus, graphData, levelView, selectedUsecases, setLevelView]);

  // Side nav implementation
  const hasUnsavedChanges = false; // TODO: Implement actual unsaved changes detection
  const hasSelection =
    levelView !== null && (levelView.modules?.length ?? 0) > 0;
  const canUndoRedo = false; // TODO: Support undo/redo stack

  const sideNavItems = useMemo(
    () => [
      // File group
      {
        disabled: !hasUnsavedChanges,
        group: 'File',
        icon: Save,
        id: 'save',
        label: 'Save',
        shortcut: 'Ctrl+S',
      },
      {
        group: 'File',
        icon: Copy,
        id: 'save-as',
        label: 'Save As',
        shortcut: 'Ctrl+Shift+S',
      },
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
    ],
    [hasUnsavedChanges, hasSelection, canUndoRedo],
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
      save: () => {
        logger.info('Save action triggered', {
          action: 'save',
          component: 'GraphDesigner',
        });
        showToast('Project saved', 'success');
      },
      'save-as': () => {
        logger.info('Save As action triggered', {
          action: 'save_as',
          component: 'GraphDesigner',
        });
        showToast('Save As dialog opened', 'info');
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
      'Ctrl+Shift+S': () => {
        logger.info('Save As shortcut triggered', {
          action: 'save_as',
          component: 'GraphDesigner',
        });
        showToast('Save As dialog opened', 'info');
      },
      'Ctrl+v': () => {
        logger.info('Paste shortcut triggered', {
          action: 'paste',
          component: 'GraphDesigner',
        });
        showToast('Pasted from clipboard', 'success');
      },
    };

    // Only add Save shortcut if there are unsaved changes
    if (hasUnsavedChanges) {
      shortcuts['Ctrl+s'] = () => {
        logger.info('Save shortcut triggered', {
          action: 'save',
          component: 'GraphDesigner',
        });
        showToast('Project saved', 'success');
      };
    }

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
  }, [hasUnsavedChanges, hasSelection, canUndoRedo, openSearch]);

  const sideNav = useSideNav(sideNavItems, sideNavHandlers, sideNavShortcuts);

  // Register side nav with provider
  useRegisterSideNav(tabId, sideNav);

  return (
    <div className="flex h-full flex-col">
      {/* Usecase Selection Control at the top */}
      <div
        className="flex-shrink-0 p-4"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderBottom: '1px solid var(--color-border-neutral-02)',
        }}
      >
        <UsecaseSelectionControl
          onSelectedUsecasesChange={setSelectedUsecases}
          projectId={projectGroupId}
          selectedUsecases={selectedUsecases}
          usecaseData={usecaseData}
        />
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
            graph={levelView}
            onScreenshotApiReady={handleScreenshotReady}
            searchHighlights={searchHighlights}
          />
        ) : null}
      </div>
    </div>
  );
};

export default GraphDesigner;
