import {useMemo, useState} from "react"

import {createTreeCollection} from "@qualcomm-ui/core/tree"
import {SideNav} from "@qualcomm-ui/react/side-nav"
import {Tooltip} from "@qualcomm-ui/react/tooltip"

import type {SideNavItem} from "~shared/types/side-nav-types"

import {useSideNavContext} from "./SideNavProvider"

export function ARCSideNav() {
  const [open, setOpen] = useState(false)
  const [wasAutoExpanded, setWasAutoExpanded] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState<string[]>([])
  const {items, onItemSelect} = useSideNavContext()

  // Dynamically discover groups in order of appearance
  // Ungrouped items appear last (at the bottom)
  const groupOrder = useMemo(() => {
    const groups: string[] = []
    const seen = new Set<string>()

    items.forEach((item) => {
      if (item.group && !seen.has(item.group)) {
        groups.push(item.group)
        seen.add(item.group)
      }
    })

    // Add ungrouped at the end so default items appear at bottom
    groups.push("ungrouped")

    return groups
  }, [items])

  // Create tree collection from items
  const collection = createTreeCollection<SideNavItem>({
    nodeChildren: "children",
    nodeText: (node) => node.label,
    nodeValue: (node) => node.id,
    rootNode: {
      children: items,
      id: "root",
      label: "",
    },
  })

  const handleNodeClick = (node: SideNavItem) => {
    const hasChildren = node.children && node.children.length > 0

    if (hasChildren) {
      // Parent with children clicked
      if (!open) {
        // Auto-expand side nav AND expand the branch to show children
        setWasAutoExpanded(true)
        setExpandedBranches([node.id])
        setOpen(true)
      }
      // Branch expansion is handled by Qualcomm UI automatically
    } else {
      // Leaf item clicked - execute action
      // Note: QUI handles disabled state, so no need to check here
      onItemSelect(node.id)

      // Auto-collapse only if it was auto-expanded
      if (wasAutoExpanded) {
        setOpen(false)
        setWasAutoExpanded(false)
      }
    }
  }

  // Handle manual expansion via collapse trigger
  const handleOpenChange = (newOpen: boolean) => {
    // Only update state if this is a manual toggle (not from our setOpen call)
    // We detect manual toggle by checking if wasAutoExpanded is false
    if (newOpen && !wasAutoExpanded) {
      // User manually expanded - this is a manual action
      setOpen(newOpen)
    } else if (!newOpen) {
      // User manually collapsed
      setOpen(newOpen)
      setWasAutoExpanded(false)
    } else {
      // This is from our auto-expand, just update open state
      setOpen(newOpen)
    }
  }

  return (
    <SideNav.Root
      collection={collection}
      expandedValue={expandedBranches}
      onExpandedValueChange={(details) =>
        setExpandedBranches(details.expandedValue)
      }
      onOpenChange={handleOpenChange}
      onSelectedValueChange={() => {}}
      open={open}
      selectedValue={[]}
      style={{
        backgroundColor: "var(--color-surface-secondary)",
        color: "var(--color-text-neutral-primary)",
      }}
    >
      <SideNav.Header>
        <SideNav.HeaderTitle>Menu</SideNav.HeaderTitle>
        <SideNav.CollapseTrigger />
      </SideNav.Header>

      {items.length > 0 &&
        collection
          .groupChildren([], (node) => node.group ?? "ungrouped", groupOrder)
          .map((group) => (
            <SideNav.Group key={group.key}>
              <SideNav.Divider />

              {group.key === "ungrouped" ? null : (
                <SideNav.GroupLabel>{group.key}</SideNav.GroupLabel>
              )}

              {group.items.map(({indexPath, node}) => (
                <SideNav.Nodes
                  key={collection.getNodeValue(node)}
                  indexPath={indexPath}
                  node={node}
                  renderBranch={({node}) =>
                    open ? (
                      <SideNav.BranchNode
                        render={
                          <button
                            onClick={() => handleNodeClick(node)}
                            type="button"
                          />
                        }
                      >
                        <SideNav.NodeIndicator />
                        {node.icon ? (
                          <SideNav.NodeIcon icon={node.icon} />
                        ) : null}
                        <SideNav.NodeText>{node.label}</SideNav.NodeText>
                        <SideNav.BranchTrigger />
                      </SideNav.BranchNode>
                    ) : (
                      <Tooltip
                        positioning={{placement: "right"}}
                        trigger={
                          <span>
                            <SideNav.BranchNode
                              render={
                                <button
                                  onClick={() => handleNodeClick(node)}
                                  type="button"
                                />
                              }
                            >
                              <SideNav.NodeIndicator />
                              {node.icon ? (
                                <SideNav.NodeIcon icon={node.icon} />
                              ) : null}
                              <SideNav.BranchTrigger />
                            </SideNav.BranchNode>
                          </span>
                        }
                      >
                        {node.tooltip || node.label}
                      </Tooltip>
                    )
                  }
                  renderLeaf={({node}) =>
                    open ? (
                      <SideNav.LeafNode
                        render={
                          <button
                            onClick={() => handleNodeClick(node)}
                            type="button"
                          />
                        }
                      >
                        <SideNav.NodeIndicator />
                        {node.icon ? (
                          <SideNav.NodeIcon icon={node.icon} />
                        ) : null}
                        <SideNav.NodeText>{node.label}</SideNav.NodeText>
                        {node.shortcut && (
                          <span className="ml-auto text-xs">
                            {node.shortcut}
                          </span>
                        )}
                      </SideNav.LeafNode>
                    ) : (
                      <Tooltip
                        positioning={{placement: "right"}}
                        trigger={
                          <span>
                            <SideNav.LeafNode
                              render={
                                <button
                                  onClick={() => handleNodeClick(node)}
                                  type="button"
                                />
                              }
                            >
                              <SideNav.NodeIndicator />
                              {node.icon ? (
                                <SideNav.NodeIcon icon={node.icon} />
                              ) : null}
                            </SideNav.LeafNode>
                          </span>
                        }
                      >
                        {node.tooltip || node.label}
                      </Tooltip>
                    )
                  }
                />
              ))}
            </SideNav.Group>
          ))}
    </SideNav.Root>
  )
}
