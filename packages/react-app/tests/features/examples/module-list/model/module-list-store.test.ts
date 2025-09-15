import {moduleListApi} from "~entities/examples/module/api"
import type {ModuleIdentity} from "~entities/examples/module/model"
import {useModuleListStore} from "~features/examples/module-list/model/module-list-store"

// Mock the moduleListApi
jest.mock("~entities/examples/module/api", () => ({
  moduleListApi: {
    fetchModules: jest.fn(),
  },
}))

// Mock console methods to avoid noise in tests
const consoleMock = {
  error: jest.fn(),
  warn: jest.fn(),
}

Object.defineProperty(console, "error", {value: consoleMock.error})
Object.defineProperty(console, "warn", {value: consoleMock.warn})

describe("ModuleListStore", () => {
  // Sample module data for testing
  const mockModules: ModuleIdentity[] = [
    {displayName: "Module 1", id: "module1", type: "audio"},
    {displayName: "Module 2", id: "module2", type: "voice"},
    {displayName: "Module 3", id: "module3", type: "audio"},
  ]

  beforeEach(() => {
    // Reset the store state before each test
    useModuleListStore.setState({
      error: null,
      isLoading: false,
      modules: [],
    })

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useModuleListStore.getState()

      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.modules).toEqual([])
    })
  })

  describe("fetchModules", () => {
    it("should set isLoading to true when fetching starts", async () => {
      // Setup mock to delay resolution
      const fetchPromise = new Promise<ModuleIdentity[]>((resolve) => {
        setTimeout(() => resolve(mockModules), 100)
      })
      ;(moduleListApi.fetchModules as jest.Mock).mockReturnValue(fetchPromise)

      // Start fetching
      const store = useModuleListStore.getState()
      const fetchPromiseResult = store.fetchModules()

      // Check loading state
      const loadingState = useModuleListStore.getState()
      expect(loadingState.isLoading).toBe(true)
      expect(loadingState.error).toBeNull()

      // Wait for fetch to complete
      await fetchPromiseResult

      // Verify final state
      const finalState = useModuleListStore.getState()
      expect(finalState.isLoading).toBe(false)
      expect(finalState.modules).toEqual(mockModules)
    })

    it("should update modules when fetch is successful", async () => {
      // Setup mock
      ;(moduleListApi.fetchModules as jest.Mock).mockResolvedValue(mockModules)

      // Execute
      const store = useModuleListStore.getState()
      await store.fetchModules()

      // Verify
      const state = useModuleListStore.getState()
      expect(state.modules).toEqual(mockModules)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it("should handle error when fetch fails", async () => {
      // Setup mock to throw error
      const errorMessage = "Failed to fetch modules"
      ;(moduleListApi.fetchModules as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      )

      // Execute
      const store = useModuleListStore.getState()
      await store.fetchModules()

      // Verify
      const state = useModuleListStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
      expect(state.modules).toEqual([])
    })

    it("should handle non-Error objects in catch block", async () => {
      // Setup mock to throw a string instead of an Error
      ;(moduleListApi.fetchModules as jest.Mock).mockRejectedValue("API Error")

      // Execute
      const store = useModuleListStore.getState()
      await store.fetchModules()

      // Verify
      const state = useModuleListStore.getState()
      expect(state.error).toBe("Failed to fetch modules")
      expect(state.isLoading).toBe(false)
    })
  })

  describe("getModuleById", () => {
    it("should return the correct module when it exists", () => {
      // Setup
      useModuleListStore.setState({modules: mockModules})

      // Execute
      const store = useModuleListStore.getState()
      const module = store.getModuleById("module2")

      // Verify
      expect(module).toEqual(mockModules[1])
    })

    it("should return null when module doesn't exist", () => {
      // Setup
      useModuleListStore.setState({modules: mockModules})

      // Execute
      const store = useModuleListStore.getState()
      const module = store.getModuleById("non-existent")

      // Verify
      expect(module).toBeNull()
    })

    it("should return null when modules array is empty", () => {
      // Execute
      const store = useModuleListStore.getState()
      const module = store.getModuleById("module1")

      // Verify
      expect(module).toBeNull()
    })
  })

  describe("updateModuleIdentity", () => {
    it("should update a module's properties", () => {
      // Setup
      useModuleListStore.setState({modules: [...mockModules]})

      // Execute
      const store = useModuleListStore.getState()
      store.updateModuleIdentity("module2", {
        displayName: "Updated Module 2",
        type: "updated",
      })

      // Verify
      const state = useModuleListStore.getState()
      expect(state.modules[1].displayName).toBe("Updated Module 2")
      expect(state.modules[1].type).toBe("updated")
      expect(state.modules[1].id).toBe("module2") // ID should not change

      // Other modules should remain unchanged
      expect(state.modules[0]).toEqual(mockModules[0])
      expect(state.modules[2]).toEqual(mockModules[2])
    })

    it("should not modify state if module id doesn't exist", () => {
      // Setup
      useModuleListStore.setState({modules: [...mockModules]})
      const initialState = useModuleListStore.getState()

      // Execute
      const store = useModuleListStore.getState()
      store.updateModuleIdentity("non-existent", {
        displayName: "This Should Not Update",
      })

      // Verify - state should be unchanged
      const finalState = useModuleListStore.getState()
      expect(finalState.modules).toEqual(initialState.modules)
    })

    it("should handle partial updates correctly", () => {
      // Setup
      useModuleListStore.setState({modules: [...mockModules]})

      // Execute - only update displayName
      const store = useModuleListStore.getState()
      store.updateModuleIdentity("module1", {
        displayName: "Partially Updated Module",
      })

      // Verify
      const state = useModuleListStore.getState()
      expect(state.modules[0].displayName).toBe("Partially Updated Module")
      expect(state.modules[0].type).toBe(mockModules[0].type) // Should remain unchanged
      expect(state.modules[0].id).toBe("module1") // ID should not change
    })
  })
})
