import {
  APP_CONFIG,
  AppTab,
  ProjectMainTab,
  ProjectTab,
  useProjectLayoutStore,
} from "~shared/store/ProjectLayoutMgr.store"
import {TabType} from "~shared/store/ProjectLayoutMgr.interface"

describe("ProjectLayoutStore", () => {
  // Helper function to create a minimal valid FlexLayout configuration
  const createMinimalLayout = () => ({
    flexLayoutData: {
      global: {},
      borders: [],
      layout: {
        type: "row",
        children: [],
      },
    },
  })

  beforeEach(() => {
    // Reset the store state before each test
    useProjectLayoutStore.setState({
      activeTab: null,
      activeTabGroup: null,
      appGroups: [],
      componentRegistry: new Map(),
      nextColorId: 1,
      panelTabRegistry: new Map(),
      previousActiveProjectGroupId: null,
      projectGroups: [],
      projectTabLayouts: new Map(),
      showGroupTitle: false,
      tabGroups: new Map(),
    })

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useProjectLayoutStore.getState()

      expect(state.activeTab).toBeNull()
      expect(state.activeTabGroup).toBeNull()
      expect(state.appGroups).toEqual([])
      expect(state.projectGroups).toEqual([])
      expect(state.componentRegistry.size).toBe(0)
      expect(state.nextColorId).toBe(1)
    })
  })

  describe("App Initialization", () => {
    it("should initialize app", () => {
      const store = useProjectLayoutStore.getState()
      store.initializeApp()
      // App initialization should complete without errors
      expect(store.initializeApp).toBeDefined()
    })
  })

  describe("App Tab Management", () => {
    it("should check if app tab is open", () => {
      const store = useProjectLayoutStore.getState()

      expect(store.isAppTabOpen("test-tab-id")).toBe(false)
    })

    it("should create app group with app tabs", () => {
      const store = useProjectLayoutStore.getState()

      const testTab = new AppTab("Test Tab", null)
      const success = store.createAppGroup(
        "test-app-group",
        "Application",
        [testTab],
      )

      expect(success).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.appGroups).toHaveLength(1)
      expect(state.appGroups[0].appTabs).toHaveLength(1)
      expect(state.appGroups[0].appTabs[0].title).toBe("Test Tab")
    })

    it("should not create app group with zero tabs", () => {
      const store = useProjectLayoutStore.getState()

      const success = store.createAppGroup("test-app-group", "Application", [])

      expect(success).toBe(false)

      const state = useProjectLayoutStore.getState()
      expect(state.appGroups).toHaveLength(0)
    })

    it("should add app tab to existing app group", () => {
      const store = useProjectLayoutStore.getState()

      const testTab1 = new AppTab("Test Tab 1", null)
      store.createAppGroup("test-app-group", "Application", [testTab1])

      const testTab2 = new AppTab("Test Tab 2", null)
      const success = store.addAppTab("test-app-group", testTab2)

      expect(success).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.appGroups[0].appTabs).toHaveLength(2)
    })

    it("should close app tab", () => {
      const store = useProjectLayoutStore.getState()

      const testTab1 = new AppTab("Test Tab 1", null)
      const testTab2 = new AppTab("Test Tab 2", null)
      store.createAppGroup("test-app-group", "Application", [testTab1, testTab2])

      expect(store.isAppTabOpen(testTab1.id)).toBe(true)

      store.closeAppTab(testTab1.id)

      const state = useProjectLayoutStore.getState()
      expect(state.appGroups[0].appTabs).toHaveLength(1)
      expect(store.isAppTabOpen(testTab1.id)).toBe(false)
    })

    it("should remove app group when closing last tab", () => {
      const store = useProjectLayoutStore.getState()

      const testTab = new AppTab("Test Tab", null)
      store.createAppGroup("test-app-group", "Application", [testTab])

      store.closeAppTab(testTab.id)

      const state = useProjectLayoutStore.getState()
      expect(state.appGroups).toHaveLength(0)
    })

    it("should set active app tab", () => {
      const store = useProjectLayoutStore.getState()

      const testTab = new AppTab("Test Tab", null)
      store.createAppGroup("test-app-group", "Application", [testTab])

      const success = store.setActiveAppTab(testTab.id)

      expect(success).toBe(true)

      const updatedState = useProjectLayoutStore.getState()
      expect(updatedState.activeTab?.id).toBe(testTab.id)
      expect(updatedState.activeTab?.tabType).toBe(TabType.AppTab)
    })

    it("should return false when setting non-existent app tab as active", () => {
      const store = useProjectLayoutStore.getState()

      const success = store.setActiveAppTab("non-existent-id")

      expect(success).toBe(false)

      const state = useProjectLayoutStore.getState()
      expect(state.activeTab).toBeNull()
    })
  })

  describe("Project Group Management", () => {
    it("should create a new project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      const success = store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      expect(success).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.projectGroups[0].id).toBe("test-project-id")
      expect(state.projectGroups[0].title).toBe("Test Project")
      expect(state.projectGroups[0].projectKey).toBe("/path/to/test.xml")
      expect(state.projectGroups[0].isCollapsed).toBe(false)
      expect(state.projectGroups[0].mainTab.title).toBe("Test Project")
      expect(state.projectGroups[0].projectTabs).toHaveLength(0)
      expect(state.activeTabGroup?.id).toBe("test-project-id")
    })

    it("should create project group with default name pattern", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("test", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "test.xml",
        mainTab,
      )

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups[0].title).toBe("test")
    })

    it("should handle different file extensions in default naming", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab1 = new ProjectMainTab("test", createMinimalLayout())
      store.createProjectGroup(
        "project-1",
        "/path/to/test.json",
        "test.json",
        mainTab1,
      )

      const mainTab2 = new ProjectMainTab("another", createMinimalLayout())
      store.createProjectGroup(
        "project-2",
        "/path/to/another.acdb",
        "another.acdb",
        mainTab2,
      )

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups[0].title).toBe("test")
      expect(state.projectGroups[1].title).toBe("another")
    })

    it("should handle file paths with backslashes", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("test", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "C:\\path\\to\\test.xml",
        "test.xml",
        mainTab,
      )

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups[0].title).toBe("test")
    })

    it("should not create project group if max project groups reached", () => {
      const store = useProjectLayoutStore.getState()

      // Create max number of project groups
      for (let i = 0; i < APP_CONFIG.MAX_PROJECT_GROUPS; i++) {
        const mainTab = new ProjectMainTab(`Project ${i}`, createMinimalLayout())
        store.createProjectGroup(
          `project-${i}`,
          `/path/to/test${i}.xml`,
          `Project ${i}`,
          mainTab,
        )
      }

      // Try to create one more
      const mainTab = new ProjectMainTab("Overflow Project", createMinimalLayout())
      const success = store.createProjectGroup(
        "overflow-project",
        "/path/to/overflow.xml",
        "Overflow Project",
        mainTab,
      )

      expect(success).toBe(false)
    })

    it("should return true and switch to existing project group if already open", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab1 = new ProjectMainTab("Test Project", createMinimalLayout())
      const success1 = store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab1,
      )

      const mainTab2 = new ProjectMainTab("Test Project", createMinimalLayout())
      const success2 = store.createProjectGroup(
        "test-project-id-2",
        "/path/to/test.xml",
        "Test Project",
        mainTab2,
      )

      expect(success1).toBe(true)
      expect(success2).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.activeTabGroup?.id).toBe("test-project-id")
    })

    it("should check if project group is already open", () => {
      const store = useProjectLayoutStore.getState()

      expect(store.isProjectGroupAlreadyOpen("/path/to/test.xml")).toBeNull()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const existingProjectGroup = store.isProjectGroupAlreadyOpen(
        "/path/to/test.xml",
      )
      expect(existingProjectGroup).not.toBeNull()
      expect(existingProjectGroup?.projectKey).toBe("/path/to/test.xml")
    })

    it("should get project group by id", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const projectGroup = store.getProjectGroupById("test-project-id")
      expect(projectGroup).not.toBeNull()
      expect(projectGroup?.id).toBe("test-project-id")

      const nonExistentProjectGroup = store.getProjectGroupById("non-existent")
      expect(nonExistentProjectGroup).toBeNull()
    })

    it("should get active project group", () => {
      const store = useProjectLayoutStore.getState()

      expect(store.getActiveProjectGroup()).toBeNull()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const activeProjectGroup = store.getActiveProjectGroup()
      expect(activeProjectGroup).not.toBeNull()
      expect(activeProjectGroup?.id).toBe("test-project-id")
    })

    it("should remove project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab1 = new ProjectMainTab("Project 1", createMinimalLayout())
      store.createProjectGroup(
        "project-1",
        "/path/to/test1.xml",
        "Project 1",
        mainTab1,
      )

      const mainTab2 = new ProjectMainTab("Project 2", createMinimalLayout())
      store.createProjectGroup(
        "project-2",
        "/path/to/test2.xml",
        "Project 2",
        mainTab2,
      )

      const removed = store.removeProjectGroup("project-1")

      expect(removed).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups).toHaveLength(1)
      expect(state.projectGroups[0].id).toBe("project-2")
      expect(state.activeTabGroup?.id).toBe("project-2")
    })

    it("should handle removing active project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      store.removeProjectGroup("test-project-id")

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups).toHaveLength(0)
      expect(state.activeTabGroup).toBeNull()
    })

    it("should rename project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Original Name", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Original Name",
        mainTab,
      )

      const success = store.renameProjectGroup("test-project-id", "New Name")

      expect(success).toBe(true)

      const state = useProjectLayoutStore.getState()
      expect(state.projectGroups[0].title).toBe("New Name")
    })

    it("should return false when switching to non-existent project group", () => {
      const store = useProjectLayoutStore.getState()

      const success = store.switchToProjectGroup("non-existent-id")

      expect(success).toBe(false)

      const state = useProjectLayoutStore.getState()
      expect(state.activeTabGroup).toBeNull()
    })
  })

  describe("Tab Management", () => {
    it("should add tab to project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const newTab = new ProjectTab("New Tab", null)
      const success = store.addTabToProjectGroup("test-project-id", newTab)

      expect(success).toBe(true)

      const state = useProjectLayoutStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === "test-project-id",
      )
      expect(projectGroup?.projectTabs).toHaveLength(1)
      expect(projectGroup?.projectTabs[0].title).toBe("New Tab")
    })

    it("should remove tab from project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const newTab = new ProjectTab("New Tab", null)
      store.addTabToProjectGroup("test-project-id", newTab)
      
      // Set the new tab as active before removing it
      store.setActiveTabInProjectGroup("test-project-id", newTab.id)

      const removed = store.removeProjectTab("test-project-id", newTab.id)

      expect(removed).toBe(true)

      const state = useProjectLayoutStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === "test-project-id",
      )
      expect(projectGroup?.projectTabs).toHaveLength(0)
      // Should fall back to main tab
      expect(projectGroup?.activeTabId).toBe(projectGroup?.mainTab.id)
    })

    it("should update active tab when removing active project tab", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const newTab1 = new ProjectTab("New Tab 1", null)
      const newTab2 = new ProjectTab("New Tab 2", null)

      store.addTabToProjectGroup("test-project-id", newTab1)
      store.addTabToProjectGroup("test-project-id", newTab2)

      let state = useProjectLayoutStore.getState()
      const projectGroup = state.projectGroups.find(
        (p) => p.id === "test-project-id",
      )
      // Last added tab should be active (based on addTabToProjectGroup behavior)
      expect(projectGroup?.projectTabs).toHaveLength(2)

      // Set newTab2 as active explicitly
      store.setActiveTabInProjectGroup("test-project-id", newTab2.id)

      // Remove the active tab
      store.removeProjectTab("test-project-id", newTab2.id)

      state = useProjectLayoutStore.getState()
      const updatedProjectGroup = state.projectGroups.find(
        (p) => p.id === "test-project-id",
      )
      expect(updatedProjectGroup?.activeTabId).toBe(newTab1.id)
    })

    it("should set active tab in project group", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const newTab = new ProjectTab("New Tab", null)
      store.addTabToProjectGroup("test-project-id", newTab)

      const state = useProjectLayoutStore.getState()
      const mainTabId = state.projectGroups[0].mainTab.id

      const success = store.setActiveTabInProjectGroup(
        "test-project-id",
        mainTabId,
      )

      expect(success).toBe(true)

      const updatedState = useProjectLayoutStore.getState()
      const projectGroup = updatedState.projectGroups.find(
        (p) => p.id === "test-project-id",
      )
      expect(projectGroup?.activeTabId).toBe(mainTabId)
    })

    it("should set active project tab (main tab)", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const state = useProjectLayoutStore.getState()
      const mainTabId = state.projectGroups[0].mainTab.id

      const success = store.setActiveProjectTab("test-project-id", mainTabId)

      expect(success).toBe(true)

      const updatedState = useProjectLayoutStore.getState()
      expect(updatedState.activeTab?.tabType).toBe(TabType.ProjectMainTab)
      expect(updatedState.activeTab?.id).toBe(mainTabId)
    })

    it("should set active project tab (project tab)", () => {
      const store = useProjectLayoutStore.getState()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const newTab = new ProjectTab("New Tab", null)
      store.addTabToProjectGroup("test-project-id", newTab)

      const success = store.setActiveProjectTab("test-project-id", newTab.id)

      expect(success).toBe(true)

      const updatedState = useProjectLayoutStore.getState()
      expect(updatedState.activeTab?.tabType).toBe(TabType.ProjectTab)
      expect(updatedState.activeTab?.id).toBe(newTab.id)
    })

    it("should return false when setting active tab for non-existent project group", () => {
      const store = useProjectLayoutStore.getState()

      const success = store.setActiveProjectTab(
        "non-existent-project",
        "some-tab",
      )

      expect(success).toBe(false)

      const state = useProjectLayoutStore.getState()
      expect(state.activeTab).toBeNull()
    })

    it("should get active project tab", () => {
      const store = useProjectLayoutStore.getState()

      expect(store.getActiveProjectTab()).toBeNull()

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const activeTab = store.getActiveProjectTab()
      expect(activeTab).not.toBeNull()
      expect(activeTab?.tabType).toBe(TabType.ProjectMainTab)
    })
  })

  describe("Visible Tabs", () => {
    it("should return app tabs and expanded project group tabs", () => {
      const store = useProjectLayoutStore.getState()

      const testTab = new AppTab("Test Tab", null)
      store.createAppGroup("test-app-group", "Application", [testTab])

      const mainTab = new ProjectMainTab("Test Project", createMinimalLayout())
      store.createProjectGroup(
        "test-project-id",
        "/path/to/test.xml",
        "Test Project",
        mainTab,
      )

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(2) // Test tab + main tab
      expect((visibleTabs[0] as any).title).toBe("Test Tab")
      expect((visibleTabs[1] as any).title).toBe("Test Project")
    })

    it("should return only app tabs when no project groups exist", () => {
      const store = useProjectLayoutStore.getState()

      const testTab = new AppTab("Test Tab", null)
      store.createAppGroup("test-app-group", "Application", [testTab])

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(1)
      expect((visibleTabs[0] as any).title).toBe("Test Tab")
    })

    it("should return empty array when no tabs or project groups exist", () => {
      const store = useProjectLayoutStore.getState()

      const visibleTabs = store.getVisibleTabs()

      expect(visibleTabs).toHaveLength(0)
    })
  })
})
