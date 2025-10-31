import type {FC} from "react"

import {ChevronDown, ChevronRight, Dot} from "lucide-react"

import {ConvertStringToNumber} from "~shared/utils/converter-utils"

import type {SubsystemBrowserTreeNode} from "../model/subsystem-browser-types"

interface SubsystemTreeNodeProps {
  isExpanded: (id: number) => boolean
  onClick: (id: number) => void
  rootNode?: boolean
  searchTerm: string
  toggleNode: (id: number) => void
  treeNode: SubsystemBrowserTreeNode
}

const SubsystemTreeNode: FC<SubsystemTreeNodeProps> = ({
  isExpanded,
  onClick,
  rootNode = false,
  searchTerm,
  toggleNode,
  treeNode,
}) => {
  const hasChildren = !!(treeNode.children && treeNode.children.length > 0)
  const expanded = isExpanded(treeNode.id)

  const searchMatches = (
    node: SubsystemBrowserTreeNode,
    searchTerm: string,
  ) => {
    const termToLower = searchTerm.trim().toLowerCase()
    if (!termToLower) {
      // empty string, treat all nodes as matches
      return true
    }

    if (node.name.toLowerCase().includes(termToLower)) {
      return true
    }

    // convert a search term that may be decimal or hex ("0xFF" or "ff") into a number
    const idNumber = ConvertStringToNumber(termToLower)
    return idNumber !== null && idNumber === node.id
  }

  // A treeNode is visible if it matches the search Input or has any matching descendants.
  const hasMatchInSubtree = (
    treeNode: SubsystemBrowserTreeNode,
    searchInput: string,
  ): boolean => {
    if (searchMatches(treeNode, searchInput)) {
      return true
    }
    return !!treeNode.children?.some((childNode) =>
      hasMatchInSubtree(childNode, searchInput),
    )
  }

  // It decides the subsystem node visibility
  const isVisible = hasMatchInSubtree(treeNode, searchTerm)

  return (
    <div style={{cursor: "pointer", marginLeft: rootNode ? 0 : "1rem"}}>
      {isVisible && (
        <div
          style={{
            alignItems: "center", // center the button vertically with the text
            display: "flex",
            gap: 2,
            marginBottom: 5,
          }}
        >
          {hasChildren ? (
            <button onClick={() => toggleNode(treeNode.id)}>
              {expanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ) : (
            <span>
              <Dot />
            </span>
          )}

          <span
            aria-label={`Navigate to ${treeNode.name}`}
            onClick={() => onClick(treeNode.id)}
            role="button"
            style={{fontWeight: "bold"}}
            title={`ID: ${treeNode.id}`}
          >
            {treeNode.name}
          </span>
        </div>
      )}
      {expanded &&
        hasChildren &&
        treeNode.children!.map((childNode) => (
          <SubsystemTreeNode
            key={childNode.id}
            isExpanded={isExpanded}
            onClick={onClick}
            searchTerm={searchTerm}
            toggleNode={toggleNode}
            treeNode={childNode}
          />
        ))}
    </div>
  )
}

export default SubsystemTreeNode
