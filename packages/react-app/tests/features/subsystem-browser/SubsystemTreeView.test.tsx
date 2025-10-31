import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SubsystemTreeView from "~features/subsystem-browser/ui/SubsystemTreeView"
import type { SubsystemBrowserTreeNode } from "~features/subsystem-browser/model/subsystem-browser-types"
import { ConvertStringToNumber } from "~shared/utils/converter-utils"
import "@testing-library/jest-dom"
import { act } from "react"

// Mock QIconButton from @qui/react to a simple button with aria-label and onClick
jest.mock("@qui/react", () => ({
  QIconButton: ({
    ariaLabel,
    onClick,
    title,
    icon,
  }: {
    ariaLabel?: string
    title?: string
    onClick?: () => void
    icon?: React.ReactNode
  }) => (
    <button aria-label={ariaLabel ?? title} title={title} onClick={onClick} data-testid="toggle-all">
      {icon}
    </button>
  ),
}))

// Update SearchBox mock to a real input so we can simulate typing
jest.mock("~features/subsystem-browser/ui/SearchBox", () => ({
  __esModule: true,
  default: ({
    onChange,
    searchTerm,
  }: {
    onChange: (value: string) => void
    searchTerm: string
  }) => (
    <input
      aria-label="search"
      value={searchTerm}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  ),
}))

// Mock SubsystemTreeNode to also render children buttons so we can assert expanded states for descendants
jest.mock("~features/subsystem-browser/ui/SubsystemTreeNode", () => ({
  __esModule: true,
  default: ({
    treeNode,
    onClick,
    isExpanded,
    searchTerm
  }: {
    treeNode: SubsystemBrowserTreeNode
    onClick: (id: number) => void
    isExpanded: (id: number) => boolean
    searchTerm: string
  }) => {
    const matches = (node: SubsystemBrowserTreeNode, term: string) => {
      const t = (typeof term === "string" ? term : "").trim().toLowerCase()
      if (!t) return true

      if(node.name.toLowerCase().includes(t)) return true

      const idNumber = ConvertStringToNumber(t)
      return idNumber !== null && idNumber === node.id
    }
    
    const hasMatchInSubtree = (node: SubsystemBrowserTreeNode, term: string): boolean =>
      matches(node, term) || !!node.children?.some((c) => hasMatchInSubtree(c, term))

    if (!hasMatchInSubtree(treeNode, searchTerm)) return null

    const RenderNode = (node: SubsystemBrowserTreeNode) => (
      <div key={node.id}>
        <button
          aria-label={`node-${node.id}`}
          onClick={() => onClick(node.id)}
          data-expanded={isExpanded(node.id)}
        >
          {node.name}
        </button>
        {node.children?.map((child) => RenderNode(child))}
      </div>
    )
    return RenderNode(treeNode)
  },
}))

// Mock the store: provide addSubsystem/removeSubsystem spies and a deterministic CreateTreeNode
const mockAdd = jest.fn()
const mockRemove = jest.fn()
jest.mock("~features/subsystem-browser/model/subsystem-browser-store", () => ({
  CreateTreeNode: (name: string) => ({ id: 56, name: `${name}-new-id` }),
  useSubsystemBrowserStore: (selector: any) =>
    selector({
      addSubsystem: mockAdd,
      removeSubsystem: mockRemove,
    }),
}))

const sampleTree: SubsystemBrowserTreeNode[] = [
  { id: 1, name: "Root1", children: [{ id: 11, name: "Child 1", children:[{id: 112, name:"Subchild 2"}] }] },
  { id: 2, name: "Root2" },
]

describe("SubsystemTreeView", () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset store state for tests that use the real store
    const { useSubsystemBrowserStore } = jest.requireActual(
      "~features/subsystem-browser/model/subsystem-browser-store"
    )
    useSubsystemBrowserStore.setState({ data: [] })
  })
  
  it("toggles expand-all/collapse-all via single button", () => {
    render(<SubsystemTreeView data={sampleTree} onClick={() => {}} />)

    // Initially should show "Expand all"
    const toggleBtn = screen.getByTestId("toggle-all")
    expect(toggleBtn).toHaveAttribute("aria-label", "Expand all")

    // Click to expand all -> label should change to "Collapse all"
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute("aria-label", "Collapse all")

    // Click again -> collapse all -> back to "Expand all"
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute("aria-label", "Expand all")
  })

  it("adds a new subsystem at root when parentId is undefined", () => {
  // Load the real store (bypass the top-level jest.mock)
  const { useSubsystemBrowserStore } = jest.requireActual(
    "~features/subsystem-browser/model/subsystem-browser-store"
  )

  // Start from a clean state
  useSubsystemBrowserStore.setState({ data: [] })

  // Create a new subsystem
  const newNode: SubsystemBrowserTreeNode = { id: 111111, name: "Child-new-id-1" }

  // Add a new subsystem at root (no parentId)
  useSubsystemBrowserStore.getState().addSubsystem(newNode)

  // Assert it was added to the store's data
  const data = useSubsystemBrowserStore.getState().data
  expect(data.length).toBe(1)
  expect(data[0]).toEqual({ id: newNode.id, name: newNode.name })
  })

  it("adds a new subsystem under a parent when parentId is provided", () => {
  const { useSubsystemBrowserStore } = jest.requireActual(
    "~features/subsystem-browser/model/subsystem-browser-store",
  )

  // Seed with a single root
  const root: SubsystemBrowserTreeNode = { id: 123, name: "Root 1" }
  useSubsystemBrowserStore.setState({ data: [root] })

  // Create a child inline
  const child: SubsystemBrowserTreeNode = { id: 1231, name: "Child-new-id-2" }

  // Add under root-1
  useSubsystemBrowserStore.getState().addSubsystem(child, 123)

  // Verify child attached under the parent
  const data = useSubsystemBrowserStore.getState().data
  const parent = data.find((n: { id: number }) => n.id === 123)
  expect(parent?.children?.some((c: { id: number; name: string }) => c.id === 1231 && c.name === "Child-new-id-2")).toBe(true)
  })

  it("remove subsystem removes a nested node and its subtree", () => {
  const { useSubsystemBrowserStore } = jest.requireActual(
    "~features/subsystem-browser/model/subsystem-browser-store",
  )

  // Seed nested tree
  const seed: SubsystemBrowserTreeNode[] = [
    {
      id: 123,
      name: "Root",
      children: [
        {
          id: 1231,
          name: "Child",
          children: [
            { id: 12311, name: "Leaf 1" },
            { id: 12312, name: "Leaf 2" },
          ],
        },
      ],
    },
  ]
  useSubsystemBrowserStore.setState({ data: seed })

  // Remove the parent node; its descendants should be removed too
  useSubsystemBrowserStore.getState().removeSubsystem(1231)

  const data = useSubsystemBrowserStore.getState().data
  const root = data.find((n: { id: number }) => n.id === 123)
  expect(root?.children?.some((c: { id: number }) => c.id === 1231)).toBe(false)
})

it("remove subsystem removes a root node", () => {
  const { useSubsystemBrowserStore } = jest.requireActual(
    "~features/subsystem-browser/model/subsystem-browser-store",
  )

  // Seed with two roots
  useSubsystemBrowserStore.setState({
    data: [
      { id: 10, name: "A" },
      { id: 11, name: "B" },
    ],
  })

  // Remove one root
  useSubsystemBrowserStore.getState().removeSubsystem(10)

  const data = useSubsystemBrowserStore.getState().data
  expect(data.some((n: { id: number }) => n.id === 10)).toBe(false)
  expect(data.some((n: { id: number }) => n.id === 11)).toBe(true)
})

it("rename subsystem updates the name of a nested node", () => {
    const { useSubsystemBrowserStore } = jest.requireActual(
      "~features/subsystem-browser/model/subsystem-browser-store",
    )

    // Seed nested tree
    const seed: SubsystemBrowserTreeNode[] = [
      {
        id: 1256,
        name: "Root",
        children: [
          {
            id: 12561,
            name: "Child",
            children: [
              { id: 125611, name: "Leaf 1" },
              { id: 125612, name: "Leaf 2" },
            ],
          },
        ],
      },
    ]
    useSubsystemBrowserStore.setState({ data: seed })

    // Rename nested node "leaf-2"
    useSubsystemBrowserStore.getState().renameSubsystem(125612, "Leaf 2 (Renamed)")

    // find node by id
    const findById = (nodes: SubsystemBrowserTreeNode[], id: number): SubsystemBrowserTreeNode | undefined => {
      for (const n of nodes) {
        if (n.id === id) return n
        const found = n.children ? findById(n.children, id) : undefined
        if (found) return found
      }
      return undefined
    }

    const data = useSubsystemBrowserStore.getState().data
    const renamed = findById(data, 125612)
    expect(renamed?.name).toBe("Leaf 2 (Renamed)")

    // Ensure siblings/ancestors are unchanged
    expect(findById(data, 125611)?.name).toBe("Leaf 1")
    expect(findById(data, 12561)?.name).toBe("Child")
    expect(findById(data, 1256)?.name).toBe("Root")
  })

it("expands subsystems when searching by name", async () => {
    render(<SubsystemTreeView data={sampleTree} onClick={() => {}} />)

    // Type 'Child 1' into search
    const search = screen.getByLabelText("search")
    fireEvent.change(search, { target: { value: "Child 1" } })

    // Advance debounce timer
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Wait for effect-driven re-render
    await waitFor(() => {
    // Root1 should be expanded to reveal its matching child
    expect(screen.getByLabelText("node-1")).toHaveAttribute("data-expanded", "true")
    // Root2 should remain invisible
    expect(screen.queryByLabelText("node-2")).toBeNull()
    })
  })

  it("expands subsystems for deep descendant name search (e.g., 'Subchild 2')", async () => {
    render(<SubsystemTreeView data={sampleTree} onClick={() => {}} />)

    const search = screen.getByLabelText("search")
    fireEvent.change(search, { target: { value: "Subchild 2" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
    // Ancestors of '112' should be expanded: Root1 and Child 1
    expect(screen.getByLabelText("node-1")).toHaveAttribute("data-expanded", "true")
    expect(screen.getByLabelText("node-11")).toHaveAttribute("data-expanded", "true")
    })
  })

  it("expand subsystems when searching by id", async () => {
    render(<SubsystemTreeView data={sampleTree} onClick={() => {}} />)

    const search = screen.getByLabelText("search")
    fireEvent.change(search, { target: { value: "0xb" } }) // id, not name

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
    // Root1 should be expanded to reveal its matching child
    expect(screen.getByLabelText("node-1")).toHaveAttribute("data-expanded", "true")

    // Root2 should remain invisible
    expect(screen.queryByLabelText("node-2")).toBeNull()
    })
  })

  it("renders no tree nodes when search term does not match any name or id", async () => {
    render(<SubsystemTreeView data={sampleTree} onClick={() => {}} />)

    const search = screen.getByLabelText("search")
    fireEvent.change(search, { target: { value: "zzz-no-match" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
    // Expect that no nodes are visible
    expect(screen.queryByLabelText("node-1")).toBeNull()
    expect(screen.queryByLabelText("node-11")).toBeNull()
    expect(screen.queryByLabelText("node-112")).toBeNull()
    expect(screen.queryByLabelText("node-2")).toBeNull()
    })
  })
})