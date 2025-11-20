import {useEffect, useMemo, useState} from "react"

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
import {logger} from "~shared/lib/logger"
import {useApplicationStore} from "~shared/store"
import {useUsecaseStore} from "~shared/store/usecase-store"

const EMPTY_SELECTED_USECASES: string[] = []

interface GraphDesignerProps {
  projectGroupId: string
  usecaseData: UsecaseCategory[]
}

const GraphDesigner: React.FC<GraphDesignerProps> = ({
  projectGroupId,
  usecaseData: initialUsecaseData,
}) => {
  // Get selected usecases directly for this project group - use a stable selector
  const selectedUsecases = useUsecaseStore(
    (state) =>
      state.selectedUsecases[projectGroupId] ?? EMPTY_SELECTED_USECASES,
  )

  // Get project group data directly - use a stable selector
  const projectGroup = useApplicationStore((state) =>
    state.projectGroups.find((pg) => pg.id === projectGroupId),
  )

  // Use usecaseData from store if available, otherwise use initial prop
  const usecaseData = useMemo(
    () => projectGroup?.usecaseData || initialUsecaseData,
    [projectGroup?.usecaseData, initialUsecaseData],
  )

  // Local state for graph visualization
  const [nodes, setNodes] = useState<RFNode[]>([])
  const [edges, setEdges] = useState<RFEdge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Get projectId from file path or use projectGroupId as fallback
      // The projectId should be stored in the project group
      const projectId = projectGroup?.id || projectGroupId

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
  }, [selectedUsecases, usecaseData, projectGroupId, projectGroup?.id])

  return (
    <div className="flex h-full flex-col">
      {/* Usecase Selection Control at the top */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <UsecaseSelectionControl
          projectGroupId={projectGroupId}
          usecaseData={usecaseData}
        />
      </div>

      {/* Graph Visualizer below */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-gray-700">
                Loading graph...
              </div>
              <div className="text-sm text-gray-500">
                Fetching usecase components
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-red-600">
                Error loading graph
              </div>
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          </div>
        ) : selectedUsecases.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-gray-700">
                No usecases selected
              </div>
              <div className="text-sm text-gray-500">
                Select usecases from the control above to view the graph
              </div>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-gray-700">
                No graph data available
              </div>
              <div className="text-sm text-gray-500">
                The selected usecases do not have any components to display
              </div>
            </div>
          </div>
        ) : (
          <UseCaseVisualizer edges={edges} nodes={nodes} />
        )}
      </div>
    </div>
  )
}

export default GraphDesigner
