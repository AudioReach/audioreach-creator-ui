import {useEffect, useMemo, useState} from "react"

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
  Type,
  Undo,
  Upload,
  Wand2,
} from "lucide-react"

import {getUsecaseComponents} from "~entities/usecases/api/usecasesApi"
import {getSystemIdsFromFormattedUsecases} from "~entities/usecases/model/usecase-utils"
import {
  type UsecaseCategory,
  UsecaseSelectionControl,
} from "~features/usecase-selection"
import {layoutWithELK, UseCaseVisualizer} from "~features/usecase-visualizer"
import {buildGraphViewFromUsecase} from "~features/usecase-visualizer/lib/adapter"
import type {
  GraphSpec,
  RFEdge,
  RFNode,
} from "~features/usecase-visualizer/model/types"
import {useUserPreferences} from "~shared/config/hooks"
import {showToast} from "~shared/controls/GlobalToaster"
import {logger} from "~shared/lib/logger"
import {useRegisterSideNav, useSideNav} from "~shared/lib/side-nav"
import {useUsecaseStore} from "~shared/store/usecase-store"

const EMPTY_SELECTED_USECASES: string[] = []

interface GraphDesignerProps {
  projectGroupId: string
  screenshotRegistry: Map<string, () => Promise<string | null>>
  tabId?: string
  usecaseData: UsecaseCategory[]
}

const GraphDesigner: React.FC<GraphDesignerProps> = ({
  projectGroupId,
  screenshotRegistry,
  tabId,
  usecaseData: initialUsecaseData,
}) => {
  // Get user preferences for this project
  const {preferences} = useUserPreferences(projectGroupId)

  // Get selected usecases directly for this project group - use a stable selector
  const selectedUsecases = useUsecaseStore(
    (state) =>
      state.selectedUsecases[projectGroupId] ?? EMPTY_SELECTED_USECASES,
  )

  // Use usecaseData from initial prop (passed from parent)
  const usecaseData = useMemo(() => initialUsecaseData, [initialUsecaseData])

  // Local state for graph visualization
  const [nodes, setNodes] = useState<RFNode[]>([])
  const [edges, setEdges] = useState<RFEdge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle screenshot function registration - directly register with passed registry
  const handleScreenshotReady = (
    screenshotFn: () => Promise<string | null>,
  ) => {
    screenshotRegistry.set(projectGroupId, screenshotFn)
    logger.verbose("Screenshot function registered", {
      action: "register_screenshot",
      component: "GraphDesigner",
      projectId: projectGroupId,
    })
  }

  // Cleanup screenshot registration on unmount
  useEffect(() => {
    return () => {
      screenshotRegistry.delete(projectGroupId)
      logger.verbose("Screenshot function unregistered", {
        action: "unregister_screenshot",
        component: "GraphDesigner",
        projectId: projectGroupId,
      })
    }
  }, [projectGroupId, screenshotRegistry])

  // Fetch graph data when selected usecases change
  useEffect(() => {
    const fetchGraphData = async () => {
      // Clear error state
      setError(null)

      // If no usecases selected, clear the graph
      if (selectedUsecases.length === 0) {
        setNodes([])
        setEdges([])
        return
      }

      // Extract systemIds from selected usecases
      const systemIds = getSystemIdsFromFormattedUsecases(
        selectedUsecases,
        usecaseData,
      )

      if (systemIds.length === 0) {
        logger.warn("No systemIds found for selected usecases", {
          action: "fetch_graph_data",
          component: "GraphDesigner",
        })
        setNodes([])
        setEdges([])
        return
      }

      // Use projectGroupId as the projectId
      const projectId = projectGroupId

      setIsLoading(true)

      try {
        logger.verbose("Fetching usecase components", {
          action: "fetch_graph_data",
          component: "GraphDesigner",
        })

        const result = await getUsecaseComponents(projectId, systemIds)

        if (result.success && result.data) {
          // Convert DTO to ReactFlow format
          const graphSpec: GraphSpec = {
            includeUsecases: systemIds.map((id, index) => ({
              id: index,
              type: "Regular",
            })),
          }

          const graphView = buildGraphViewFromUsecase(result.data, graphSpec)

          const graphViewWithELK = await layoutWithELK(graphView)

          setNodes(graphViewWithELK.nodes)
          setEdges(graphViewWithELK.edges)

          logger.verbose("Graph data loaded successfully", {
            action: "fetch_graph_data",
            component: "GraphDesigner",
          })
        } else {
          const errorMsg =
            result.message || "Failed to fetch usecase components"
          setError(errorMsg)
          logger.error("Failed to fetch usecase components", {
            action: "fetch_graph_data",
            component: "GraphDesigner",
            error: errorMsg,
          })
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMsg)
        logger.error("Error fetching usecase components", {
          action: "fetch_graph_data",
          component: "GraphDesigner",
          error: errorMsg,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGraphData()
  }, [selectedUsecases, usecaseData, projectGroupId])

  // Side nav implementation
  const hasUnsavedChanges = false // TODO: Implement actual unsaved changes detection
  const hasSelection = nodes.length > 0 // Enable copy/paste when there are nodes
  const canUndoRedo = false //TODO: Support undo/redo stack

  const sideNavItems = useMemo(
    () => [
      // File group
      {
        disabled: !hasUnsavedChanges,
        group: "File",
        icon: Save,
        id: "save",
        label: "Save",
        shortcut: "Ctrl+S",
      },
      {
        group: "File",
        icon: Copy,
        id: "save-as",
        label: "Save As",
        shortcut: "Ctrl+Shift+S",
      },
      // Edit group
      {
        disabled: !canUndoRedo,
        group: "Edit",
        icon: Undo,
        id: "undo",
        label: "Undo",
        shortcut: "Ctrl+Z",
      },
      {
        disabled: !canUndoRedo,
        group: "Edit",
        icon: Redo,
        id: "redo",
        label: "Redo",
        shortcut: "Ctrl+Y",
      },
      {
        disabled: !hasSelection,
        group: "Edit",
        icon: Clipboard,
        id: "copy",
        label: "Copy",
        shortcut: "Ctrl+C",
        tooltip: !hasSelection ? "Copy is currently unavailable" : "",
      },
      {
        group: "Edit",
        icon: Type,
        id: "paste",
        label: "Paste",
        shortcut: "Ctrl+V",
      },
      // Tools group

      {
        group: "Tools",
        icon: Package,
        id: "module-manager",
        label: "Module Manager",
      },
      {
        group: "Tools",
        icon: Cpu,
        id: "driver-module",
        label: "Driver Module",
      },
      {
        group: "Tools",
        icon: FileText,
        id: "view-qact-log",
        label: "View QACT Log",
      },
      {
        children: [
          {
            icon: Edit,
            id: "view-edit-definitions",
            label: "View/Edit Definitions",
          },
          {
            icon: Download,
            id: "import-h2xml",
            label: "Import Definitions",
          },
          {
            icon: Upload,
            id: "export-definitions",
            label: "Export Definitions",
          },
        ],
        group: "Tools",
        icon: Wand2,
        id: "discovery-wizard",
        label: "Discovery Wizard",
      },
    ],
    [hasUnsavedChanges, hasSelection, canUndoRedo],
  )

  const sideNavHandlers = useMemo(
    () => ({
      copy: () => {
        logger.info("Copy action triggered", {
          action: "copy",
          component: "GraphDesigner",
        })
        showToast("Copied to clipboard", "success")
      },
      "driver-module": () => {
        logger.info("Driver Module action triggered", {
          action: "driver_module",
          component: "GraphDesigner",
        })
        showToast("Opening Driver Module", "info")
      },
      "export-definitions": () => {
        logger.info("Export definitions action triggered", {
          action: "export_definitions",
          component: "GraphDesigner",
        })
        showToast("Exporting definitions to header", "info")
      },
      "import-h2xml": () => {
        logger.info("Import H2XML action triggered", {
          action: "import_h2xml",
          component: "GraphDesigner",
        })
        showToast("Opening H2XML import dialog", "info")
      },
      "module-manager": () => {
        logger.info("Module Manager action triggered", {
          action: "module_manager",
          component: "GraphDesigner",
        })
        showToast("Opening Module Manager", "info")
      },
      paste: () => {
        logger.info("Paste action triggered", {
          action: "paste",
          component: "GraphDesigner",
        })
        showToast("Pasted from clipboard", "success")
      },
      redo: () => {
        logger.info("Redo action triggered", {
          action: "redo",
          component: "GraphDesigner",
        })
        showToast("Redo", "info")
      },
      save: () => {
        logger.info("Save action triggered", {
          action: "save",
          component: "GraphDesigner",
        })
        showToast("Project saved", "success")
      },
      "save-as": () => {
        logger.info("Save As action triggered", {
          action: "save_as",
          component: "GraphDesigner",
        })
        showToast("Save As dialog opened", "info")
      },
      undo: () => {
        logger.info("Undo action triggered", {
          action: "undo",
          component: "GraphDesigner",
        })
        showToast("Undo", "info")
      },
      "view-edit-definitions": () => {
        logger.info("View/Edit Definitions action triggered", {
          action: "view_edit_definitions",
          component: "GraphDesigner",
        })
        showToast("Opening View/Edit Definitions", "info")
      },
      "view-qact-log": () => {
        logger.info("View QACT Log action triggered", {
          action: "view_qact_log",
          component: "GraphDesigner",
        })
        showToast("Opening QACT Log", "info")
      },
    }),
    [],
  )

  const sideNavShortcuts = useMemo(() => {
    const shortcuts: Record<string, () => void> = {
      "Ctrl+Shift+S": () => {
        logger.info("Save As shortcut triggered", {
          action: "save_as",
          component: "GraphDesigner",
        })
        showToast("Save As dialog opened", "info")
      },
      "Ctrl+v": () => {
        logger.info("Paste shortcut triggered", {
          action: "paste",
          component: "GraphDesigner",
        })
        showToast("Pasted from clipboard", "success")
      },
    }

    // Only add Save shortcut if there are unsaved changes
    if (hasUnsavedChanges) {
      shortcuts["Ctrl+s"] = () => {
        logger.info("Save shortcut triggered", {
          action: "save",
          component: "GraphDesigner",
        })
        showToast("Project saved", "success")
      }
    }

    // Only add Copy shortcut if there's a selection
    if (hasSelection) {
      shortcuts["Ctrl+c"] = () => {
        logger.info("Copy shortcut triggered", {
          action: "copy",
          component: "GraphDesigner",
        })
        showToast("Copied to clipboard", "success")
      }
    }

    // Only add Undo/Redo shortcuts if canUndoRedo is true
    if (canUndoRedo) {
      shortcuts["Ctrl+z"] = () => {
        logger.info("Undo shortcut triggered", {
          action: "undo",
          component: "GraphDesigner",
        })
        showToast("Undo", "info")
      }
      shortcuts["Ctrl+y"] = () => {
        logger.info("Redo shortcut triggered", {
          action: "redo",
          component: "GraphDesigner",
        })
        showToast("Redo", "info")
      }
    }

    return shortcuts
  }, [hasUnsavedChanges, hasSelection, canUndoRedo])

  const sideNav = useSideNav(sideNavItems, sideNavHandlers, sideNavShortcuts)

  // Register side nav with provider
  useRegisterSideNav(tabId, sideNav)

  return (
    <div className="flex h-full flex-col">
      {/* Usecase Selection Control at the top */}
      <div
        className="flex-shrink-0 p-4"
        style={{
          backgroundColor: "var(--color-surface-primary)",
          borderBottom: "1px solid var(--color-border-neutral-02)",
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
        style={{backgroundColor: "var(--color-surface-primary)"}}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="mb-2 text-lg font-semibold"
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                Loading graph...
              </div>
              <div
                className="text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
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
                style={{color: "var(--color-border-support-danger)"}}
              >
                Error loading graph
              </div>
              <div
                className="text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
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
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                No usecases selected
              </div>
              <div
                className="text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
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
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                No graph data available
              </div>
              <div
                className="text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
              >
                The selected usecases do not have any components to display
              </div>
            </div>
          </div>
        ) : (
          <UseCaseVisualizer
            edges={edges}
            nodes={nodes}
            onScreenshotReady={handleScreenshotReady}
            userPreferences={preferences}
          />
        )}
      </div>
    </div>
  )
}

export default GraphDesigner
