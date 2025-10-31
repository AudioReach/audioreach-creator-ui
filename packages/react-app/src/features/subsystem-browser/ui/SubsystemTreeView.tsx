import {type FC, useEffect, useMemo, useState} from "react"

import {ChevronsDown, ChevronsUp} from "lucide-react"

import {QIconButton} from "@qui/react"

import type {SubsystemBrowserTreeNode} from "~features/subsystem-browser/model/subsystem-browser-types"
import {ConvertStringToNumber} from "~shared/utils/converter-utils"

import SearchBox from "./SearchBox"
import SubsystemTreeNode from "./SubsystemTreeNode"

interface SubsystemTreeViewProps {
  data: SubsystemBrowserTreeNode[]
  onClick: (id: number) => void
}

// collect all ids in the tree (depth-first)
function extractAllSubsystemIds(nodes: SubsystemBrowserTreeNode[]): number[] {
  return nodes.flatMap((node) => [
    node.id,
    ...(node.children ? extractAllSubsystemIds(node.children) : []),
  ])
}

// For nodes expansion, collect ancestor ids for nodes that match the search term
function collectAncestorIdsForMatches(
  nodes: SubsystemBrowserTreeNode[],
  searchTerm: string,
  path: number[] = [],
): number[] {
  const ids: number[] = []
  const term = searchTerm.trim().toLowerCase()
  for (const node of nodes) {
    const nameMatches = node.name.toLowerCase().includes(term)
    let idMatches: boolean = false
    if (!nameMatches) {
      // convert a search term that may be decimal or hex ("0xFF" or "ff") into a number
      const idNumber = ConvertStringToNumber(term)
      idMatches = idNumber !== null && idNumber === node.id
    }

    const childMatches = node.children
      ? collectAncestorIdsForMatches(node.children, searchTerm, [
          ...path,
          node.id,
        ])
      : []
    if (nameMatches || idMatches) {
      // Expand the entire ancestor path so this node becomes visible
      ids.push(...path)
    }
    if (childMatches.length) {
      // If any descendant matches, this node should also be expanded
      ids.push(node.id, ...childMatches)
    }
  }
  return Array.from(new Set(ids))
}

const SubsystemTreeView: FC<SubsystemTreeViewProps> = ({data, onClick}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({})
  // to reduce traversal frequency of searchTerm
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  const isExpanded = (id: number) => !!expandedIds[id] // !! guarantees the result is strictly a boolean, not undefined, null, or other truthy/falsy values
  const toggleNode = (id: number) => {
    setExpandedIds((prevState) => ({...prevState, [id]: !prevState[id]}))
  }

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300) // 300ms debounce
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Auto-expand ancestors to reveal matches when searching
  useEffect(() => {
    const term = debouncedSearchTerm?.trim()
    if (!term) {
      // Optional: collapse when search is cleared
      // setExpandedIds({})
      return
    }

    // controls expansion
    const idsToExpand = collectAncestorIdsForMatches(data, term)
    setExpandedIds((prev) => {
      const next = {...prev}
      idsToExpand.forEach((id) => {
        next[id] = true
      })
      return next
    })
  }, [debouncedSearchTerm, data])

  // Compute all ids and whether they are all expanded
  const allIds = useMemo(() => extractAllSubsystemIds(data), [data])
  const isFullyExpanded =
    allIds.length > 0 && allIds.every((id) => expandedIds[id])

  // Single toggle: expand all if not fully expanded, otherwise collapse all
  const toggleAll = () => {
    if (isFullyExpanded) {
      setExpandedIds({})
    } else {
      setExpandedIds(
        allIds.reduce(
          (acc, id) => {
            acc[id] = true
            return acc
          },
          {} as Record<number, boolean>,
        ),
      )
    }
  }

  return (
    <div>
      {/* Controls in a single row */}
      <div className="mb-2 flex flex-nowrap items-center gap-2">
        <SearchBox
          onChange={setSearchTerm}
          onClear={() => setSearchTerm("")}
          searchTerm={searchTerm}
        />

        {/* Single toggle button for Collapse all and Expand all */}
        <QIconButton
          aria-label={isFullyExpanded ? "Collapse all" : "Expand all"}
          color="neutral"
          dense
          icon={
            isFullyExpanded ? (
              <ChevronsUp size={20} />
            ) : (
              <ChevronsDown size={20} />
            )
          }
          onClick={toggleAll}
          size="s"
          style={{
            background: "#fff",
          }}
          title={isFullyExpanded ? "Collapse all" : "Expand all"}
          variant="outline"
        />
      </div>
      {data.map((treeNode) => (
        <SubsystemTreeNode
          key={treeNode.id}
          isExpanded={isExpanded}
          onClick={onClick}
          rootNode
          searchTerm={debouncedSearchTerm} // Using the debounced term for visibility to keep it in sync with expansion
          toggleNode={toggleNode}
          treeNode={treeNode}
        />
      ))}
    </div>
  )
}

export default SubsystemTreeView
