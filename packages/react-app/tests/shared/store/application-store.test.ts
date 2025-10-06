import {APP_CONFIG, useApplicationStore} from "~shared/store/application-store"
import type {ProjectTab} from "~shared/store/store-types"

// Mock console methods to avoid noise in tests
const consoleMock = {
  error: jest.fn(),
  warn: jest.fn(),
}

Object.defineProperty(console, "error", {value: consoleMock.error})
Object.defineProperty(console, "warn", {value: consoleMock.warn})

describe("ApplicationStore", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useApplicationStore.setState({
      activeProjectGroupId: null,
      activeTab: null,
      appGroup: {
        appTabs: [],
        id: "test-app-group",
        isCollapsed: false,
        name: "Application",
      },
      maxProjectGroups: APP_CONFIG.MAX_PROJECT_GROUPS,
      projectGroups: [],
    })

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useApplicationStore.getState()

      expect(state.activeProjectGroupId).toBeNull()
      expect(state.activeTab).toBeNull()
      expect(state.appGroup.appTabs).toEqual([])
      expect(state.projectGroups).toEqual([])
      expect(state.maxProjectGroups).toBe(APP_CONFIG.MAX_PROJECT_GROUPS)
    })
  })

  describe("App Initialization", () => {
    it("should initialize app", () => {
      const store = useApplicationStore.getState()
      store.initializeApp()
      // App initialization should complete without errors
      expect(store.initializeApp).toBeDefined()
    })
  })

  describe("App Tab Management", () => {
    it("should check if app tab is open", () => {
      const store = useApplicationStore.getState()

      expect(store.isAppTabOpen("test")).toBe(false)
    })

    it("should close app tab", () => {
      const store = useApplicationStore.getState()

      // Manually add an app tab for testing
      useApplicationStore.setState({
        appGroup: {
          appTabs: [
            {
              component: null,
              id: "test-tab",
              isCloseable: true,
              tabKey: "test",
              title: "Test Tab",
            },
          ],
          id: "test-app-group",
          isCollapsed: false,
          name: "Application",
        },
      })

      expect(store.isAppTabOpen("test")).toBe(true)

      store.closeAppTab("test")

      const state = useApplicationStore.getState()
      expect(state.appGroup.appTabs).toHaveLength(0)
      expect(store.isAppTabOpen("test")).toBe(false)
    })

    it("should set active app tab", () => {
      const store = useApplicationStore.getState()

      // Manually add an app tab for testing
      const testTab = {
        component: null,
        id: "test-tab",
        isCloseable: true,
        tabKey: "test",
        title: "Test Tab",
      }

      useApplicationStore.setState({
        appGroup: {
          appTabs: [testTab],
          id: "test-app-group",
          isCollapsed: false,
          name: "Application",
        },
      })

      store.setActiveAppTab(testTab.id)

      const updatedState = useApplicationStore.getState()
      expect(updatedState.activeTab?.type).toBe("app-tab")
      expect(updatedState.activeTab?.id).toBe(testTab.id)
    })

    it("should warn when setting non-existent app tab as active", () => {
      const store = useApplicationStore.getState()

      store.setActiveAppTab("non-existent-id")

      expect(consoleMock.warn).toHaveBeenCalledWith(
        "App tab with id non-existent-id not found",
      )
    })
  })

  describe("Project Group Management", () => {
    it("should create a new project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      const state = useApplicationStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.projectGroups[0].id).toBe(projectGroupId)
      expect(state.projectGroups[0].name).toBe("Test Project")
      expect(state.projectGroups[0].filePath).toBe("/path/to/test.xml")
      expect(state.projectGroups[0].isCollapsed).toBe(false)
      expect(state.projectGroups[0].mainTab.title).toBe("Test Project")
      expect(state.projectGroups[0].projectTabs).toHaveLength(0)
      expect(state.activeProjectGroupId).toBe(projectGroupId)
    })

    it("should create project group with default name when name not provided", () => {
      const store = useApplicationStore.getState()
      store.createProjectGroup("/path/to/test.xml")
      const state = useApplicationStore.getState()
      expect(state.projectGroups[0].name).toBe("test")
    })

    it("should handle different file extensions in default naming", () => {
      const store = useApplicationStore.getState()

      store.createProjectGroup("/path/to/test.json")
      store.createProjectGroup("/path/to/another.acdb")

      const state = useApplicationStore.getState()
      expect(state.projectGroups[0].name).toBe("test")
      expect(state.projectGroups[1].name).toBe("another")
    })

    it("should handle file paths with backslashes", () => {
      const store = useApplicationStore.getState()

      store.createProjectGroup("C:\\path\\to\\test.xml")

      const state = useApplicationStore.getState()
      expect(state.projectGroups[0].name).toBe("test")
    })

    it("should not create project group if max project groups reached", () => {
      const store = useApplicationStore.getState()

      // Create max number of project groups
      for (let i = 0; i < APP_CONFIG.MAX_PROJECT_GROUPS; i++) {
        store.createProjectGroup(`/path/to/test${i}.xml`, `Project ${i}`)
      }

      // Try to create one more
      expect(() => {
        store.createProjectGroup("/path/to/overflow.xml", "Overflow Project")
      }).toThrow(
        `Maximum number of project groups (${APP_CONFIG.MAX_PROJECT_GROUPS}) reached`,
      )
    })

    it("should return existing project group if already open", () => {
      const store = useApplicationStore.getState()

      const projectGroupId1 = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const projectGroupId2 = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      expect(projectGroupId1).toBe(projectGroupId2)

      const state = useApplicationStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.activeProjectGroupId).toBe(projectGroupId1)
    })

    it("should check if project group can be created", () => {
      const store = useApplicationStore.getState()

      expect(store.canCreateNewProjectGroup()).toBe(true)

      // Create max number of project groups
      for (let i = 0; i < APP_CONFIG.MAX_PROJECT_GROUPS; i++) {
        store.createProjectGroup(`/path/to/test${i}.xml`, `Project ${i}`)
      }

      expect(store.canCreateNewProjectGroup()).toBe(false)
    })

    it("should check if project group is already open", () => {
      const store = useApplicationStore.getState()

      expect(store.isProjectGroupAlreadyOpen("/path/to/test.xml")).toBeNull()

      store.createProjectGroup("/path/to/test.xml", "Test Project")

      const existingProjectGroup =
        store.isProjectGroupAlreadyOpen("/path/to/test.xml")
      expect(existingProjectGroup).not.toBeNull()
      expect(existingProjectGroup?.filePath).toBe("/path/to/test.xml")
    })

    it("should get project group by id", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      const projectGroup = store.getProjectGroupById(projectGroupId)
      expect(projectGroup).not.toBeNull()
      expect(projectGroup?.id).toBe(projectGroupId)

      const nonExistentProjectGroup = store.getProjectGroupById("non-existent")
      expect(nonExistentProjectGroup).toBeNull()
    })

    it("should get active project group", () => {
      const store = useApplicationStore.getState()

      expect(store.getActiveProjectGroup()).toBeNull()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      const activeProjectGroup = store.getActiveProjectGroup()
      expect(activeProjectGroup).not.toBeNull()
      expect(activeProjectGroup?.id).toBe(projectGroupId)
    })

    it("should remove project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId1 = store.createProjectGroup(
        "/path/to/test1.xml",
        "Project 1",
      )
      const projectGroupId2 = store.createProjectGroup(
        "/path/to/test2.xml",
        "Project 2",
      )

      store.removeProjectGroup(projectGroupId1)

      const state = useApplicationStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.projectGroups[0].id).toBe(projectGroupId2)
      expect(state.activeProjectGroupId).toBe(projectGroupId2)
    })

    it("should handle removing active project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      store.removeProjectGroup(projectGroupId)

      const state = useApplicationStore.getState()
      expect(state.projectGroups).toHaveLength(0)
      expect(state.activeProjectGroupId).toBeNull()
    })

    it("should rename project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Original Name",
      )

      store.renameProjectGroup(projectGroupId, "New Name")

      const state = useApplicationStore.getState()
      expect(state.projectGroups[0].name).toBe("New Name")
    })

    it("should warn when switching to non-existent project group", () => {
      const store = useApplicationStore.getState()

      store.switchToProjectGroup("non-existent-id")

      expect(consoleMock.warn).toHaveBeenCalledWith(
        "Project group with id non-existent-id not found",
      )
    })
  })

  describe("Tab Management", () => {
    it("should add tab to project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab: ProjectTab = {
        component: null,
        id: "new-tab-id",
        title: "New Tab",
      }

      store.addTabToProjectGroup(projectGroupId, newTab)

      const state = useApplicationStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === projectGroupId,
      )
      expect(projectGroup?.projectTabs).toHaveLength(1)
      expect(projectGroup?.projectTabs[0]).toEqual(newTab)
      expect(projectGroup?.activeTabId).toBe(newTab.id)
    })

    it("should remove tab from project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab: ProjectTab = {
        component: null,
        id: "new-tab-id",
        title: "New Tab",
      }

      store.addTabToProjectGroup(projectGroupId, newTab)
      store.removeTabFromProjectGroup(projectGroupId, newTab.id)

      const state = useApplicationStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === projectGroupId,
      )
      expect(projectGroup?.projectTabs).toHaveLength(0)
      // Should fall back to main tab
      expect(projectGroup?.activeTabId).toBe(projectGroup?.mainTab.id)
    })

    it("should update active tab when removing active project tab", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab1: ProjectTab = {
        component: null,
        id: "new-tab-1",
        title: "New Tab 1",
      }
      const newTab2: ProjectTab = {
        component: null,
        id: "new-tab-2",
        title: "New Tab 2",
      }

      store.addTabToProjectGroup(projectGroupId, newTab1)
      store.addTabToProjectGroup(projectGroupId, newTab2)

      let state = useApplicationStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === projectGroupId,
      )
      expect(projectGroup?.activeTabId).toBe(newTab2.id)

      // Remove the active tab
      store.removeTabFromProjectGroup(projectGroupId, newTab2.id)

      state = useApplicationStore.getState()
      const updatedProjectGroup = state.projectGroups.find(
        (p) => p.id === projectGroupId,
      )
      expect(updatedProjectGroup?.activeTabId).toBe(newTab1.id)
    })

    it("should set active tab in project group", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab: ProjectTab = {
        component: null,
        id: "new-tab-id",
        title: "New Tab",
      }

      store.addTabToProjectGroup(projectGroupId, newTab)

      const state = useApplicationStore.getState()
      const mainTabId = state.projectGroups[0].mainTab.id

      store.setActiveTabInProjectGroup(projectGroupId, mainTabId)

      const updatedState = useApplicationStore.getState()
      const projectGroup = updatedState.projectGroups.find(
        (p) => p.id === projectGroupId,
      )
      expect(projectGroup?.activeTabId).toBe(mainTabId)
    })

    it("should set active project tab (main tab)", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const state = useApplicationStore.getState()
      const mainTabId = state.projectGroups[0].mainTab.id

      store.setActiveProjectTab(projectGroupId, mainTabId)

      const updatedState = useApplicationStore.getState()
      expect(updatedState.activeTab?.type).toBe("main-tab")
      expect(updatedState.activeTab?.id).toBe(mainTabId)
      expect(updatedState.activeTab?.projectGroupId).toBe(projectGroupId)
    })

    it("should set active project tab (project tab)", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab: ProjectTab = {
        component: null,
        id: "new-tab-id",
        title: "New Tab",
      }

      store.addTabToProjectGroup(projectGroupId, newTab)
      store.setActiveProjectTab(projectGroupId, newTab.id)

      const updatedState = useApplicationStore.getState()
      expect(updatedState.activeTab?.type).toBe("project-tab")
      expect(updatedState.activeTab?.id).toBe(newTab.id)
      expect(updatedState.activeTab?.projectGroupId).toBe(projectGroupId)
    })

    it("should warn when setting active tab for non-existent project group", () => {
      const store = useApplicationStore.getState()

      store.setActiveProjectTab("non-existent-project", "some-tab")

      expect(consoleMock.warn).toHaveBeenCalledWith(
        "Project group with id non-existent-project not found",
      )
    })

    it("should warn when setting non-existent tab as active", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      store.setActiveProjectTab(projectGroupId, "non-existent-tab")

      expect(consoleMock.warn).toHaveBeenCalledWith(
        `Tab with id non-existent-tab not found in project group ${projectGroupId}`,
      )
    })

    it("should get active tab", () => {
      const store = useApplicationStore.getState()

      expect(store.getActiveTab()).toBeNull()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )

      const activeTab = store.getActiveTab()
      expect(activeTab).not.toBeNull()
      expect(activeTab?.type).toBe("main-tab")
      expect(activeTab?.projectGroupId).toBe(projectGroupId)
    })

    it("should get active tab content for main tab", () => {
      const store = useApplicationStore.getState()

      store.createProjectGroup("/path/to/test.xml", "Test Project")

      const activeTabContent = store.getActiveTabContent()
      expect(activeTabContent).not.toBeNull()
      expect((activeTabContent as any)?.title).toBe("Test Project")
    })

    it("should get active tab content for project tab", () => {
      const store = useApplicationStore.getState()

      const projectGroupId = store.createProjectGroup(
        "/path/to/test.xml",
        "Test Project",
      )
      const newTab: ProjectTab = {
        component: null,
        id: "new-tab-id",
        title: "New Tab",
      }

      store.addTabToProjectGroup(projectGroupId, newTab)
      store.setActiveProjectTab(projectGroupId, newTab.id)

      const activeTabContent = store.getActiveTabContent()
      expect(activeTabContent).not.toBeNull()
      expect((activeTabContent as any)?.title).toBe("New Tab")
    })

    it("should get active tab content for app tab", () => {
      const store = useApplicationStore.getState()

      // Manually add an app tab for testing
      const testTab = {
        component: null,
        id: "test-tab",
        isCloseable: true,
        tabKey: "test",
        title: "Test Tab",
      }

      useApplicationStore.setState({
        activeTab: {
          id: testTab.id,
          type: "app-tab" as const,
        },
        appGroup: {
          appTabs: [testTab],
          id: "test-app-group",
          isCollapsed: false,
          name: "Application",
        },
      })

      const activeTabContent = store.getActiveTabContent()
      expect(activeTabContent).not.toBeNull()
      expect((activeTabContent as any).tabKey).toBe("test")
    })

    it("should return null for active tab content when no active tab", () => {
      const store = useApplicationStore.getState()

      const activeTabContent = store.getActiveTabContent()
      expect(activeTabContent).toBeNull()
    })

    it("should return null for active tab content when project group not found", () => {
      const store = useApplicationStore.getState()

      // Manually set an invalid active tab
      useApplicationStore.setState({
        activeTab: {
          id: "some-tab",
          projectGroupId: "non-existent-project",
          type: "project-tab",
        },
      })

      const activeTabContent = store.getActiveTabContent()
      expect(activeTabContent).toBeNull()
    })
  })

  describe("Visible Tabs", () => {
    it("should return app tabs and expanded project group tabs", () => {
      const store = useApplicationStore.getState()

      // Manually add an app tab for testing
      const testTab = {
        component: null,
        id: "test-tab",
        isCloseable: true,
        tabKey: "test",
        title: "Test Tab",
      }

      useApplicationStore.setState({
        appGroup: {
          appTabs: [testTab],
          id: "test-app-group",
          isCollapsed: false,
          name: "Application",
        },
      })

      store.createProjectGroup("/path/to/test.xml", "Test Project")

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(2) // Test tab + main tab
      expect(visibleTabs[0] as any).toHaveProperty("tabKey", "test")
      expect(visibleTabs[1] as any).toHaveProperty("title", "Test Project")
    })

    it("should return only app tabs when no project groups exist", () => {
      const store = useApplicationStore.getState()

      // Manually add an app tab for testing
      const testTab = {
        component: null,
        id: "test-tab",
        isCloseable: true,
        tabKey: "test",
        title: "Test Tab",
      }

      useApplicationStore.setState({
        appGroup: {
          appTabs: [testTab],
          id: "test-app-group",
          isCollapsed: false,
          name: "Application",
        },
      })

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(1)
      expect(visibleTabs[0] as any).toHaveProperty("tabKey", "test")
    })

    it("should return empty array when no tabs or project groups exist", () => {
      const store = useApplicationStore.getState()

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(0)
    })
  })
})
