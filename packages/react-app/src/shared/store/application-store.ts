import {create} from "zustand"

import type {
  ActiveTab,
  AppGroup,
  ApplicationConfig,
  ApplicationStore,
  AppTab,
  MainTab,
  ProjectGroup,
  ProjectTab,
} from "./store-types"

// Configuration constants
const APP_CONFIG: ApplicationConfig = {
  AUTO_COLLAPSE_ON_NEW_PROJECT: false, // Disable auto-collapse for now
  DEFAULT_PROJECT_NAME_PATTERN: (filename: string) => {
    const name = filename.split(/[/\\]/).pop() || filename
    return name.replace(/\.(xml|json|acdb)$/i, "")
  },
  MAX_PROJECT_GROUPS: 5,
  STORAGE_VERSION: "1.0",
}

// Utility function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Default main tab creation function
const createDefaultMainTab = (): MainTab => ({
  component: null,
  id: generateId(),
  title: "Graph",
})

// Default app group creation function
const createDefaultAppGroup = (): AppGroup => ({
  appTabs: [],
  id: generateId(),
  isCollapsed: false,
  name: "Application",
})

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  activeProjectGroupId: null,
  activeTab: null,
  // Add AppTab to the application group
  addAppTab: (appTab: AppTab): void => {
    set((state) => ({
      appGroup: {
        ...state.appGroup,
        appTabs: [...state.appGroup.appTabs, appTab],
      },
    }))
  },
  // Tab management within project groups
  addTabToProjectGroup: (projectGroupId: string, tab: ProjectTab): void => {
    set((state) => ({
      projectGroups: state.projectGroups.map((projectGroup) =>
        projectGroup.id === projectGroupId
          ? {
              ...projectGroup,
              activeTabId: tab.id, // Make the new tab active
              projectTabs: [...projectGroup.projectTabs, tab],
            }
          : projectGroup,
      ),
    }))
  },

  // Single app group
  appGroup: createDefaultAppGroup(),
  canCreateNewProjectGroup: (): boolean => {
    const state = get()
    return state.projectGroups.length < state.maxProjectGroups
  },

  closeAppTab: (tabKey: string): void => {
    set((state) => ({
      appGroup: {
        ...state.appGroup,
        appTabs: state.appGroup.appTabs.filter((tab) => tab.tabKey !== tabKey),
      },
    }))
  },

  // Project Group management
  createProjectGroup: (filePath: string, name?: string): string => {
    const state = get()

    // Check if we can create a new Project Group
    if (!state.canCreateNewProjectGroup()) {
      throw new Error(
        `Maximum number of project groups (${state.maxProjectGroups}) reached`,
      )
    }

    // Check if project group already exists
    const existingProjectGroup = state.isProjectGroupAlreadyOpen(filePath)
    if (existingProjectGroup) {
      // Switch to existing project group instead of creating new one
      state.switchToProjectGroup(existingProjectGroup.id)
      return existingProjectGroup.id
    }

    const projectGroupId = generateId()
    const defaultMainTab = createDefaultMainTab()
    const projectGroupName =
      name || APP_CONFIG.DEFAULT_PROJECT_NAME_PATTERN(filePath)

    const newProjectGroup: ProjectGroup = {
      activeTabId: defaultMainTab.id,
      filePath,
      id: projectGroupId,
      isCollapsed: false,
      mainTab: defaultMainTab,
      name: projectGroupName,
      projectTabs: [],
    }

    set((state) => {
      const updatedProjectGroups = [...state.projectGroups, newProjectGroup]

      // If this is the second project group and auto-collapse is enabled, collapse the first one
      if (
        updatedProjectGroups.length > 1 &&
        APP_CONFIG.AUTO_COLLAPSE_ON_NEW_PROJECT
      ) {
        updatedProjectGroups.forEach((projectGroup) => {
          if (projectGroup.id !== projectGroupId) {
            projectGroup.isCollapsed = true
          }
        })
      }

      return {
        activeProjectGroupId: projectGroupId,
        activeTab: {
          id: newProjectGroup.activeTabId,
          projectGroupId,
          type: "main-tab",
        },
        projectGroups: updatedProjectGroups,
      }
    })

    return projectGroupId
  },

  // Navigation utility methods
  getActiveProjectGroup: (): ProjectGroup | null => {
    const state = get()
    return (
      state.projectGroups.find(
        (projectGroup) => projectGroup.id === state.activeProjectGroupId,
      ) || null
    )
  },

  getActiveTab: (): ActiveTab | null => {
    const state = get()
    return state.activeTab
  },

  getActiveTabContent: (): AppTab | MainTab | ProjectTab | null => {
    const state = get()

    if (!state.activeTab) {
      return null
    }

    if (state.activeTab.type === "app-tab") {
      return (
        state.appGroup.appTabs.find((tab) => tab.id === state.activeTab!.id) ||
        null
      )
    } else if (
      (state.activeTab.type === "main-tab" ||
        state.activeTab.type === "project-tab") &&
      state.activeTab.projectGroupId
    ) {
      const projectGroup = state.getProjectGroupById(
        state.activeTab.projectGroupId,
      )
      if (projectGroup) {
        if (state.activeTab.type === "main-tab") {
          return projectGroup.mainTab.id === state.activeTab.id
            ? projectGroup.mainTab
            : null
        } else {
          return (
            projectGroup.projectTabs.find(
              (tab) => tab.id === state.activeTab!.id,
            ) || null
          )
        }
      }
    }

    return null
  },

  getProjectGroupById: (projectGroupId: string): ProjectGroup | null => {
    const state = get()
    return (
      state.projectGroups.find(
        (projectGroup) => projectGroup.id === projectGroupId,
      ) || null
    )
  },

  // Dynamic tab visibility (key feature)
  getVisibleTabs: () => {
    const state = get()
    const visibleTabs: (AppTab | ProjectGroup | MainTab | ProjectTab)[] = []

    // Always show app tabs
    visibleTabs.push(...state.appGroup.appTabs)

    // Show project tabs based on collapse state
    state.projectGroups.forEach((projectGroup) => {
      if (projectGroup.isCollapsed) {
        // Show as single project group tab
        visibleTabs.push(projectGroup)
      } else {
        // Show main tab and individual project tabs
        visibleTabs.push(projectGroup.mainTab)
        visibleTabs.push(...projectGroup.projectTabs)
      }
    })

    return visibleTabs
  },

  // App lifecycle
  initializeApp: (): void => {
    // App initialization logic can be added here if needed
  },

  isAppTabOpen: (tabKey: string): boolean => {
    const state = get()
    return state.appGroup.appTabs.some((tab) => tab.tabKey === tabKey)
  },

  isProjectGroupAlreadyOpen: (filePath: string): ProjectGroup | null => {
    const state = get()
    return (
      state.projectGroups.find(
        (projectGroup) => projectGroup.filePath === filePath,
      ) || null
    )
  },

  maxProjectGroups: APP_CONFIG.MAX_PROJECT_GROUPS,

  projectGroups: [],

  removeProjectGroup: (projectGroupId: string): void => {
    set((state) => {
      const updatedProjectGroups = state.projectGroups.filter(
        (projectGroup) => projectGroup.id !== projectGroupId,
      )

      // If we removed the active project group, set a new active project group
      let newActiveProjectGroupId = state.activeProjectGroupId
      if (state.activeProjectGroupId === projectGroupId) {
        newActiveProjectGroupId =
          updatedProjectGroups.length > 0 ? updatedProjectGroups[0].id : null
      }

      // If only one project group remains, expand it
      if (updatedProjectGroups.length === 1) {
        updatedProjectGroups[0].isCollapsed = false
      }

      return {
        activeProjectGroupId: newActiveProjectGroupId,
        projectGroups: updatedProjectGroups,
      }
    })
  },

  removeTabFromProjectGroup: (projectGroupId: string, tabId: string): void => {
    set((state) => ({
      projectGroups: state.projectGroups.map((projectGroup) => {
        if (projectGroup.id !== projectGroupId) {
          return projectGroup
        }

        const updatedProjectTabs = projectGroup.projectTabs.filter(
          (tab) => tab.id !== tabId,
        )

        // If we removed the active tab, set a new active tab
        let newActiveTabId = projectGroup.activeTabId
        if (projectGroup.activeTabId === tabId) {
          // Default to main tab if no project tabs remain, or first project tab
          newActiveTabId =
            updatedProjectTabs.length > 0
              ? updatedProjectTabs[0].id
              : projectGroup.mainTab.id
        }

        return {
          ...projectGroup,
          activeTabId: newActiveTabId,
          projectTabs: updatedProjectTabs,
        }
      }),
    }))
  },

  renameProjectGroup: (projectGroupId: string, newName: string): void => {
    set((state) => ({
      projectGroups: state.projectGroups.map((projectGroup) =>
        projectGroup.id === projectGroupId
          ? {...projectGroup, name: newName}
          : projectGroup,
      ),
    }))
  },

  // Active tab management
  setActiveAppTab: (appTabId: string): void => {
    const state = get()
    const appTab = state.appGroup.appTabs.find((tab) => tab.id === appTabId)

    if (!appTab) {
      console.warn(`App tab with id ${appTabId} not found`)
      return
    }

    set({
      activeTab: {
        id: appTabId,
        type: "app-tab",
      },
    })
  },

  setActiveProjectTab: (projectGroupId: string, tabId: string): void => {
    const state = get()
    const projectGroup = state.getProjectGroupById(projectGroupId)

    if (!projectGroup) {
      console.warn(`Project group with id ${projectGroupId} not found`)
      return
    }

    // Check if it's the main tab or a project tab
    let tabType: "main-tab" | "project-tab"
    if (projectGroup.mainTab.id === tabId) {
      tabType = "main-tab"
    } else {
      const projectTab = projectGroup.projectTabs.find((t) => t.id === tabId)
      if (!projectTab) {
        console.warn(
          `Tab with id ${tabId} not found in project group ${projectGroupId}`,
        )
        return
      }
      tabType = "project-tab"
    }

    // Update the active tab in the project group
    state.setActiveTabInProjectGroup(projectGroupId, tabId)

    // Set the global active tab
    set({
      activeTab: {
        id: tabId,
        projectGroupId,
        type: tabType,
      },
    })
  },

  setActiveTabInProjectGroup: (projectGroupId: string, tabId: string): void => {
    set((state) => ({
      projectGroups: state.projectGroups.map((projectGroup) =>
        projectGroup.id === projectGroupId
          ? {...projectGroup, activeTabId: tabId}
          : projectGroup,
      ),
    }))
  },

  switchToProjectGroup: (projectGroupId: string): void => {
    const state = get()
    const targetProjectGroup = state.getProjectGroupById(projectGroupId)

    if (!targetProjectGroup) {
      console.warn(`Project group with id ${projectGroupId} not found`)
      return
    }

    // Determine the tab type for the active tab
    let tabType: "main-tab" | "project-tab"
    if (targetProjectGroup.mainTab.id === targetProjectGroup.activeTabId) {
      tabType = "main-tab"
    } else {
      tabType = "project-tab"
    }

    set((state) => ({
      activeProjectGroupId: projectGroupId,
      activeTab: {
        id: targetProjectGroup.activeTabId,
        projectGroupId,
        type: tabType,
      },
      // Don't collapse other projects - keep them all expanded for now
      projectGroups: state.projectGroups.map((projectGroup) => ({
        ...projectGroup,
        isCollapsed: false, // Keep all projects expanded
      })),
    }))
  },
}))

// Export configuration for external use
export {APP_CONFIG}
