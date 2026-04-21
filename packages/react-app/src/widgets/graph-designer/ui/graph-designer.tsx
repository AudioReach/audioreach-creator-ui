/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useState} from 'react';

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

import {getUsecaseComponents} from '~entities/usecases/api/usecases-api';
import {getSystemIdsFromFormattedUsecases} from '~entities/usecases/model/usecase-utils';
import {
  SearchComponent,
  useSearchComponentStore,
} from '~features/search-component';
import {
  type UsecaseCategory,
  UsecaseSelectionControl,
} from '~features/usecase-selection';
import {
  layoutWithELK,
  UsecaseVisualizer,
  useVisualizerSelectionStore,
} from '~features/usecase-visualizer';
import {buildGraphViewFromUsecase} from '~features/usecase-visualizer/lib/adapter';
import type {
  GraphSpec,
  RFEdge,
  RFNode,
} from '~features/usecase-visualizer/model/usecase-visualizer.types';
import {useUserPreferences} from '~shared/config/hooks';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {useRegisterSideNav, useSideNav} from '~shared/lib/side-nav';
import {useUsecaseStore} from '~shared/store/use-usecase-store';

import {searchNodes} from '../lib/graph-search';

const EMPTY_SELECTED_USECASES: string[] = [];

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
  // Get user preferences for this project
  const {preferences} = useUserPreferences(projectGroupId);

  // Get selected usecases directly for this project group - use a stable selector
  const selectedUsecases = useUsecaseStore(
    (state) =>
      state.selectedUsecases[projectGroupId] ?? EMPTY_SELECTED_USECASES,
  );

  // Use usecaseData from initial prop (passed from parent)
  const usecaseData = useMemo(() => initialUsecaseData, [initialUsecaseData]);

  // Local state for graph visualization
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);

  // Search state
  const [hasSearched, setHasSearched] = useState(false);
  const [matchingNodes, setMatchingNodes] = useState<RFNode[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Selection store actions
  const clearSelection = useVisualizerSelectionStore((s) => s.clearSelection);
  const setSearchHighlight = useVisualizerSelectionStore(
    (s) => s.setSearchHighlight,
  );
  const clearSearchHighlight = useVisualizerSelectionStore(
    (s) => s.clearSearchHighlight,
  );

  // Read the current search term from the store — single source of truth
  const currentSearchTerm = useSearchComponentStore(
    (s) => s.getProjectState(projectGroupId).searchTerm,
  );

  // Opens the search panel and focuses the input (works whether panel is new or already visible)
  const openSearch = useCallback(() => {
    setIsSearchVisible(true);
    setSearchFocusTrigger((prev) => prev + 1);
  }, []);

  // Resets all search state — call when usecase changes or search is closed
  const resetSearch = useCallback(() => {
    setHasSearched(false);
    setMatchingNodes([]);
    setCurrentMatchIndex(0);
    clearSearchHighlight(projectGroupId);
  }, [projectGroupId, clearSearchHighlight]);

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

  // Re-run search when nodes change (handles both node add and node remove)
  // Only fires if a search is already active — preserves results, does not reset
  useEffect(() => {
    if (!hasSearched || !currentSearchTerm.trim()) {
      return;
    }

    const matches = searchNodes(nodes, currentSearchTerm);
    setMatchingNodes(matches);

    // Clamp the current index to the new valid range
    const clampedIndex =
      matches.length > 0 ? Math.min(currentMatchIndex, matches.length - 1) : 0;
    setCurrentMatchIndex(clampedIndex);

    const matchIds = new Set(matches.map((n) => n.id));
    const activeId = matches[clampedIndex]?.id ?? null;
    setSearchHighlight(projectGroupId, matchIds, activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Search handlers
  const handleSearch = useCallback(
    (term: string) => {
      if (!term.trim()) {
        resetSearch();
        clearSelection(projectGroupId);
        return;
      }

      setHasSearched(true);

      const matches = searchNodes(nodes, term);
      setMatchingNodes(matches);
      setCurrentMatchIndex(0);

      // Highlight all matching nodes and mark the first one as active
      const matchIds = new Set(matches.map((n) => n.id));
      const activeId = matches[0]?.id ?? null;
      setSearchHighlight(projectGroupId, matchIds, activeId);
    },
    [nodes, projectGroupId, setSearchHighlight, clearSelection, resetSearch],
  );

  const handleSearchNext = useCallback(() => {
    if (matchingNodes.length === 0) {
      return;
    }
    const nextIndex = (currentMatchIndex + 1) % matchingNodes.length;
    setCurrentMatchIndex(nextIndex);
    // Update the active node in the highlight store
    const matchIds = new Set(matchingNodes.map((n) => n.id));
    setSearchHighlight(projectGroupId, matchIds, matchingNodes[nextIndex].id);
  }, [matchingNodes, currentMatchIndex, projectGroupId, setSearchHighlight]);

  const handleSearchPrevious = useCallback(() => {
    if (matchingNodes.length === 0) {
      return;
    }
    const prevIndex =
      (currentMatchIndex - 1 + matchingNodes.length) % matchingNodes.length;
    setCurrentMatchIndex(prevIndex);
    // Update the active node in the highlight store
    const matchIds = new Set(matchingNodes.map((n) => n.id));
    setSearchHighlight(projectGroupId, matchIds, matchingNodes[prevIndex].id);
  }, [matchingNodes, currentMatchIndex, projectGroupId, setSearchHighlight]);

  const handleSearchClose = useCallback(() => {
    setIsSearchVisible(false);
    resetSearch();
    clearSelection(projectGroupId);
  }, [projectGroupId, clearSelection, resetSearch]);

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

  // Fetch graph data when selected usecases change
  useEffect(() => {
    const fetchGraphData = async () => {
      // Reset search state when usecase selection changes
      resetSearch();

      // Clear error state
      setError(null);

      // If no usecases selected, clear the graph
      if (selectedUsecases.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      // Extract systemIds from selected usecases
      const systemIds = getSystemIdsFromFormattedUsecases(
        selectedUsecases,
        usecaseData,
      );

      if (systemIds.length === 0) {
        logger.warn('No systemIds found for selected usecases', {
          action: 'fetch_graph_data',
          component: 'GraphDesigner',
        });
        setNodes([]);
        setEdges([]);
        return;
      }

      // Use projectGroupId as the projectId
      const projectId = projectGroupId;

      setIsLoading(true);

      try {
        logger.verbose('Fetching usecase components', {
          action: 'fetch_graph_data',
          component: 'GraphDesigner',
        });

        const result = await getUsecaseComponents(projectId, systemIds);

        if (result.success && result.data) {
          // Convert DTO to ReactFlow format
          const graphSpec: GraphSpec = {
            includeUsecases: systemIds.map((id, index) => ({
              id: index,
              type: 'Regular',
            })),
          };

          const graphView = buildGraphViewFromUsecase(result.data, graphSpec);

          const graphViewWithELK = await layoutWithELK(graphView);

          setNodes(graphViewWithELK.nodes);
          setEdges(graphViewWithELK.edges);

          // If the search panel is open and a term is present, re-run the
          // search against the new graph.  Setting hasSearched=true here
          // (after resetSearch cleared it at the top) causes the
          // useEffect([nodes]) to fire and call searchNodes with the new nodes.
          if (isSearchVisible && currentSearchTerm.trim()) {
            setHasSearched(true);
          }

          logger.verbose('Graph data loaded successfully', {
            action: 'fetch_graph_data',
            component: 'GraphDesigner',
          });
        } else {
          const errorMsg =
            result.message || 'Failed to fetch usecase components';
          setError(errorMsg);
          logger.error('Failed to fetch usecase components', {
            action: 'fetch_graph_data',
            component: 'GraphDesigner',
            error: errorMsg,
          });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        logger.error('Error fetching usecase components', {
          action: 'fetch_graph_data',
          component: 'GraphDesigner',
          error: errorMsg,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsecases, usecaseData, projectGroupId]);

  // Side nav implementation
  const hasUnsavedChanges = false; // TODO: Implement actual unsaved changes detection
  const hasSelection = nodes.length > 0; // Enable copy/paste when there are nodes
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
          projectGroupId={projectGroupId}
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
        {isSearchVisible && (
          <div
            style={{
              maxWidth: 'calc(100% - 24px)',
              position: 'absolute',
              right: '12px',
              top: '5px',
              width: '380px',
              zIndex: 10,
            }}
          >
            <SearchComponent
              currentMatch={
                matchingNodes.length > 0 ? currentMatchIndex + 1 : 0
              }
              focusTrigger={searchFocusTrigger}
              onClose={handleSearchClose}
              onNext={handleSearchNext}
              onPrevious={handleSearchPrevious}
              onSearch={handleSearch}
              projectId={projectGroupId}
              totalMatches={hasSearched ? matchingNodes.length : undefined}
            />
          </div>
        )}

        {isLoading ? (
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
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: 'var(--color-border-support-danger)'}}
              >
                Error loading graph
              </div>
              <div
                className="text-sm"
                style={{color: 'var(--color-text-neutral-secondary)'}}
              >
                {error}
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
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: 'var(--color-text-neutral-primary)'}}
              >
                No graph data available
              </div>
              <div
                className="text-sm"
                style={{color: 'var(--color-text-neutral-secondary)'}}
              >
                The selected usecases do not have any components to display
              </div>
            </div>
          </div>
        ) : (
          <UsecaseVisualizer
            edges={edges}
            nodes={nodes}
            onScreenshotReady={handleScreenshotReady}
            projectId={projectGroupId}
            userPreferences={preferences}
          />
        )}
      </div>
    </div>
  );
};

export default GraphDesigner;
