import {create} from "zustand"

import type {SubsystemBrowserTreeNode} from "~features/subsystem-browser/model/subsystem-browser-types"

type SubsystemBrowserStore = {
  addSubsystem: (
    newSubsystem: SubsystemBrowserTreeNode,
    parentId?: number,
  ) => void
  data: SubsystemBrowserTreeNode[]
  removeSubsystem: (id: number) => void
  renameSubsystem: (id: number, newName: string) => void
  setSubsystemData: (newSubSystemData: SubsystemBrowserTreeNode[]) => void
}

function doesSubsystemExist(
  existingTreeData: SubsystemBrowserTreeNode[],
  id: number,
): boolean {
  for (const subsystemNode of existingTreeData) {
    if (subsystemNode.id === id) {
      return true
    }
    if (
      subsystemNode.children &&
      doesSubsystemExist(subsystemNode.children, id)
    ) {
      return true
    }
  }
  return false
}

function addSubsystem(
  treeData: SubsystemBrowserTreeNode[],
  newSubsystem: SubsystemBrowserTreeNode,
  parentId?: number,
): SubsystemBrowserTreeNode[] {
  if (!parentId) {
    // No parentId: add as root node
    return [...treeData, newSubsystem]
  }
  // Recursive add
  return treeData.map((item) => {
    if (item.id === parentId) {
      // Add to children (initialize if missing)
      const children = item.children
        ? [...item.children, newSubsystem]
        : [newSubsystem]
      return {...item, children}
    }
    // Recurse into children
    return item.children
      ? {...item, children: addSubsystem(item.children, newSubsystem, parentId)}
      : item
  })
}

// Recursive remove (works for root and nested nodes)
function removeSubsystem(
  treeData: SubsystemBrowserTreeNode[],
  id: number,
): SubsystemBrowserTreeNode[] {
  return treeData
    .filter((item) => item.id !== id)
    .map((item) =>
      item.children
        ? {...item, children: removeSubsystem(item.children, id)}
        : item,
    )
}

// Recursive rename (works for root and nested nodes)
function renameSubsystem(
  treeData: SubsystemBrowserTreeNode[],
  id: number,
  newName: string,
): SubsystemBrowserTreeNode[] {
  return treeData.map((item) => {
    if (item.id === id) {
      return {...item, name: newName}
    }
    return item.children
      ? {...item, children: renameSubsystem(item.children, id, newName)}
      : item
  })
}

export const useSubsystemBrowserStore = create<SubsystemBrowserStore>(
  (set, get) => ({
    addSubsystem: (newSubsystem, parentId) => {
      const currentData = get().data

      // check for subsystem exists to avoid unnecessary updates to store
      if (doesSubsystemExist(currentData, newSubsystem.id)) {
        // TODO: Log this error info
        return
      }

      if (parentId && !doesSubsystemExist(currentData, parentId)) {
        // TODO: Log this error info
        return
      }

      set({
        data: addSubsystem(currentData, newSubsystem, parentId),
      })
    },
    data: [],
    removeSubsystem: (id) => {
      const currentData = get().data

      if (!doesSubsystemExist(currentData, id)) {
        // TODO: Log this warning info
        return
      }

      set({
        data: removeSubsystem(currentData, id),
      })
    },
    renameSubsystem: (id, newName) => {
      const currentData = get().data

      if (!doesSubsystemExist(currentData, id)) {
        // TODO: Log this error info
        return
      }

      set({
        data: renameSubsystem(currentData, id, newName),
      })
    },
    setSubsystemData: (newSubsystemData) => set({data: newSubsystemData}),
  }),
)
