import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {useSelectedModuleStore} from "~entities/examples/module"
import {useModuleListStore} from "~features/examples/module-list/model/module-list-store"
import {ModuleList} from "~features/examples/module-list/ui/ModuleList"

// Mock the stores
jest.mock("~features/examples/module-list/model/module-list-store", () => ({
  useModuleListStore: jest.fn(),
}))
jest.mock("~entities/examples/module", () => ({
  useSelectedModuleStore: jest.fn(),
}))

// Mock the Lucide icons
jest.mock("lucide-react", () => ({
  AudioLines: () => <div data-testid="audio-lines-icon" />,
  Loader: () => <div data-testid="loader-icon" />,
}))

// Mock the QUI components
jest.mock("@qui/react", () => ({
  QDivider: ({children}: {children?: React.ReactNode}) => (
    <div data-testid="q-divider">{children}</div>
  ),
  QList: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div className={className} data-testid="q-list">
      {children}
    </div>
  ),
  QListItem: ({
    description,
    label,
    onClick,
    startIcon: StartIcon,
  }: {
    description: string
    label: string
    onClick: () => void
    size: string
    startIcon: React.ComponentType
  }) => (
    <div
      data-description={description}
      data-label={label}
      data-testid="q-list-item"
      onClick={onClick}
    >
      {StartIcon && <StartIcon />}
      <div>{label}</div>
      <div>{description}</div>
    </div>
  ),
  QProgressCircle: ({size}: {size: string}) => (
    <div data-size={size} data-testid="q-progress-circle" />
  ),
  QStatus: ({
    icon: Icon,
    label,
  }: {
    color: string
    icon: React.ComponentType
    kind: string
    label: string
    size: string
  }) => (
    <div data-testid="q-status">
      {Icon && <Icon />}
      <div>{label}</div>
    </div>
  ),
}))

describe("ModuleList", () => {
  // Sample module data for testing
  const mockModules = [
    {displayName: "Module 1", id: "module1", type: "audio"},
    {displayName: "Module 2", id: "module2", type: "voice"},
    {displayName: "Module 3", id: "module3", type: "audio"},
  ]

  // Mock functions
  const mockFetchModules = jest.fn()
  const mockSelectModule = jest.fn()

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup default mock implementations
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: null,
      fetchModules: mockFetchModules,
      isLoading: false,
      modules: [],
    })
    ;(useSelectedModuleStore as unknown as jest.Mock).mockReturnValue({
      selectModule: mockSelectModule,
    })
  })

  it("should fetch modules on mount", () => {
    render(<ModuleList />)
    expect(mockFetchModules).toHaveBeenCalledTimes(1)
  })

  it("should display loading state", () => {
    // Mock loading state
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: null,
      fetchModules: mockFetchModules,
      isLoading: true,
      modules: [],
    })

    render(<ModuleList />)

    // Check loading indicators
    expect(screen.getByTestId("q-status")).toBeInTheDocument()
    expect(screen.getByText("Loading Module List ...")).toBeInTheDocument()
    expect(screen.getByTestId("q-progress-circle")).toBeInTheDocument()
  })

  it("should display error message", () => {
    // Mock error state
    const errorMessage = "API Error"
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: errorMessage,
      fetchModules: mockFetchModules,
      isLoading: false,
      modules: [],
    })

    render(<ModuleList />)

    // Check error message
    expect(
      screen.getByText(`Error: Something went wrong ${errorMessage}`),
    ).toBeInTheDocument()
  })

  it("should display empty state when no modules", () => {
    // Mock empty modules array
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: null,
      fetchModules: mockFetchModules,
      isLoading: false,
      modules: [],
    })

    render(<ModuleList />)

    // Check empty state message
    expect(screen.getByText("No modules found")).toBeInTheDocument()
  })

  it("should display list of modules", () => {
    // Mock modules data
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: null,
      fetchModules: mockFetchModules,
      isLoading: false,
      modules: mockModules,
    })

    render(<ModuleList />)

    // Check module list header
    expect(screen.getByText("Modules")).toBeInTheDocument()

    // Check that all modules are displayed
    expect(screen.getByText("Module 1")).toBeInTheDocument()
    expect(screen.getByText("Module 2")).toBeInTheDocument()
    expect(screen.getByText("Module 3")).toBeInTheDocument()

    // Check that list items have correct data attributes
    const listItems = screen.getAllByTestId("q-list-item")
    expect(listItems).toHaveLength(3)
    expect(listItems[0]).toHaveAttribute("data-label", "Module 1")
    expect(listItems[0]).toHaveAttribute("data-description", "module1")
    expect(listItems[1]).toHaveAttribute("data-label", "Module 2")
    expect(listItems[1]).toHaveAttribute("data-description", "module2")
  })

  it("should call selectModule when clicking on a module", async () => {
    // Mock modules data
    ;(useModuleListStore as unknown as jest.Mock).mockReturnValue({
      error: null,
      fetchModules: mockFetchModules,
      isLoading: false,
      modules: mockModules,
    })

    render(<ModuleList />)

    // Find and click on the second module
    const listItems = screen.getAllByTestId("q-list-item")
    await userEvent.click(listItems[1])

    // Check that selectModule was called with the correct ID
    expect(mockSelectModule).toHaveBeenCalledTimes(1)
    expect(mockSelectModule).toHaveBeenCalledWith("module2")
  })
})
