import type {ReactNode} from "react"

import {create} from "zustand"

import type {
  ActiveTab,
  ApplicationConfig,
  ApplicationStore,
  AppPage,
  ProjectPage,
  RecentFile,
  Tab,
} from "./types"

// Configuration constants
const APP_CONFIG: ApplicationConfig = {
  AUTO_COLLAPSE_ON_NEW_PROJECT: true,
  DEFAULT_PROJECT_NAME_PATTERN: (filename: string) => {
    const name = filename.split(/[/\\]/).pop() || filename
    return name.replace(/\.(xml|json|acdb)$/i, "")
  },
  MAX_PROJECTS: 5,
  MAX_RECENT_FILES: 10,
  STORAGE_VERSION: "1.0",
}

// Storage keys
const STORAGE_KEYS = {
  RECENT_FILES: "audioreach-recent-files",
}

// Utility function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Default tab creation function
const createDefaultTabs = (): Tab[] => [
  {
    component: null as ReactNode, // Here
    id: generateId(),
    title: "Graph",
  },
]

// Create start page
const createStartPage = (): AppPage => ({
  component: null as ReactNode, // Will be set when component is available
  id: "start-page",
  isCloseable: true,
  pageKey: "start",
  title: "Start",
})

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  activeProjectId: null,
  activeTab: null,
  // Recently opened files management
  addRecentFile: (filePath: string): void => {
    set((state) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const now = new Date()

      // Remove existing entry if it exists
      const filteredFiles = state.recentFiles.filter(
        (file) => file.filePath !== filePath,
      )

      // Add to the beginning (most recent)
      const newRecentFile: RecentFile = {
        fileName,
        filePath,
        lastOpened: now,
      }

      const updatedRecentFiles = [newRecentFile, ...filteredFiles].slice(
        0,
        state.maxRecentFiles,
      )

      // Save to storage
      const newState = {
        recentFiles: updatedRecentFiles,
      }

      // Persist to localStorage
      setTimeout(() => {
        get().saveRecentFilesToStorage()
      }, 0)

      return newState
    })
  },
  // Tab management within projects
  addTabToProject: (projectId: string, tab: Tab): void => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              activeTabId: tab.id, // Make the new tab active
              tabs: [...project.tabs, tab],
            }
          : project,
      ),
    }))
  },
  // State
  appPages: [],
  canCreateNewProject: (): boolean => {
    const state = get()
    return state.projects.length < state.maxProjects
  },
  clearRecentFiles: (): void => {
    set({
      recentFiles: [],
    })

    // Clear from storage
    setTimeout(() => {
      get().saveRecentFilesToStorage()
    }, 0)
  },

  closeAppPage: (pageKey: string): void => {
    set((state) => ({
      appPages: state.appPages.filter((page) => page.pageKey !== pageKey),
    }))
  },

  // Project management
  createProject: (filePath: string, name?: string): string => {
    const state = get()

    // Check if we can create a new Project
    if (!state.canCreateNewProject()) {
      throw new Error(
        `Maximum number of projects (${state.maxProjects}) reached`,
      )
    }

    // Check if project already exists
    const existingProject = state.isProjectAlreadyOpen(filePath)
    if (existingProject) {
      // Switch to existing project instead of creating new one
      state.switchToProject(existingProject.id)
      return existingProject.id
    }

    const projectId = generateId()
    const defaultTabs = createDefaultTabs()
    const projectName =
      name || APP_CONFIG.DEFAULT_PROJECT_NAME_PATTERN(filePath)

    const newProject: ProjectPage = {
      activeTabId: defaultTabs[0]?.id || "",
      filePath,
      id: projectId,
      isCollapsed: false,
      name: projectName,
      tabs: defaultTabs,
    }

    set((state) => {
      const updatedProjects = [...state.projects, newProject]

      // If this is the second project and auto-collapse is enabled, collapse the first one
      if (
        updatedProjects.length > 1 &&
        APP_CONFIG.AUTO_COLLAPSE_ON_NEW_PROJECT
      ) {
        updatedProjects.forEach((project) => {
          if (project.id !== projectId) {
            project.isCollapsed = true
          }
        })
      }

      return {
        activeProjectId: projectId,
        activeTab: {
          id: newProject.activeTabId,
          projectId,
          type: "project-tab",
        },
        projects: updatedProjects,
      }
    })

    // Add to recent files
    state.addRecentFile(filePath)

    return projectId
  },

  createProjectFromRecentFile: (filePath: string): string | null => {
    const state = get()
    try {
      const projectId = state.createProject(filePath)
      return projectId
    } catch (error) {
      console.error("Failed to create project from recent file:", error)
      return null
    }
  },

  // Navigation utility methods
  getActiveProject: (): ProjectPage | null => {
    const state = get()
    return (
      state.projects.find((project) => project.id === state.activeProjectId) ||
      null
    )
  },

  getActiveTab: (): ActiveTab | null => {
    const state = get()
    return state.activeTab
  },

  getActiveTabContent: (): AppPage | Tab | null => {
    const state = get()

    if (!state.activeTab) {
      return null
    }

    if (state.activeTab.type === "app-page") {
      return (
        state.appPages.find((page) => page.id === state.activeTab!.id) || null
      )
    } else if (
      state.activeTab.type === "project-tab" &&
      state.activeTab.projectId
    ) {
      const project = state.getProjectById(state.activeTab.projectId)
      if (project) {
        return (
          project.tabs.find((tab) => tab.id === state.activeTab!.id) || null
        )
      }
    }

    return null
  },

  getProjectById: (projectId: string): ProjectPage | null => {
    const state = get()
    return state.projects.find((project) => project.id === projectId) || null
  },

  getRecentFiles: (): RecentFile[] => {
    const state = get()
    // Return sorted by most recent first
    return [...state.recentFiles].sort(
      (a, b) => b.lastOpened.getTime() - a.lastOpened.getTime(),
    )
  },

  // Dynamic tab visibility (key feature)
  getVisibleTabs: () => {
    const state = get()
    const visibleTabs: (AppPage | ProjectPage | Tab)[] = []

    // Always show app pages
    visibleTabs.push(...state.appPages)

    // Show project tabs based on collapse state
    state.projects.forEach((project) => {
      if (project.isCollapsed) {
        // Show as single project tab
        visibleTabs.push(project)
      } else {
        // Show individual tabs
        visibleTabs.push(...project.tabs)
      }
    })

    return visibleTabs
  },

  // App lifecycle
  initializeApp: (): void => {
    const state = get()

    // Load recent files from storage
    state.loadRecentFilesFromStorage()

    // Open start page
    state.openStartPage()
  },

  isAppPageOpen: (pageKey: string): boolean => {
    const state = get()
    return state.appPages.some((page) => page.pageKey === pageKey)
  },

  isProjectAlreadyOpen: (filePath: string): ProjectPage | null => {
    const state = get()
    return (
      state.projects.find((project) => project.filePath === filePath) || null
    )
  },

  // Persistence
  loadRecentFilesFromStorage: (): void => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_FILES)
      if (stored) {
        const data = JSON.parse(stored)
        if (
          data.version === APP_CONFIG.STORAGE_VERSION &&
          Array.isArray(data.files)
        ) {
          const recentFiles: RecentFile[] = data.files.map((file: any) => ({
            ...file,
            lastOpened: new Date(file.lastOpened),
          }))

          set({
            recentFiles: recentFiles.slice(0, get().maxRecentFiles),
          })
        }
      }
    } catch (error) {
      console.error("Failed to load recent files from storage:", error)
    }
  },

  maxProjects: APP_CONFIG.MAX_PROJECTS,

  maxRecentFiles: APP_CONFIG.MAX_RECENT_FILES,

  // App page management
  openStartPage: (): void => {
    const state = get()
    const existingStartPage = state.appPages.find(
      (page) => page.pageKey === "start",
    )

    if (existingStartPage) {
      // If start page already exists, just set it as active
      state.setActiveAppPage(existingStartPage.id)
      return
    }

    // Create new start page
    const startPage = createStartPage()
    set((state) => ({
      activeTab: {
        id: startPage.id,
        type: "app-page",
      },
      appPages: [...state.appPages, startPage],
    }))
  },

  projects: [],

  recentFiles: [],

  removeProject: (projectId: string): void => {
    set((state) => {
      const updatedProjects = state.projects.filter(
        (project) => project.id !== projectId,
      )

      // If we removed the active project, set a new active project
      let newActiveProjectId = state.activeProjectId
      if (state.activeProjectId === projectId) {
        newActiveProjectId =
          updatedProjects.length > 0 ? updatedProjects[0].id : null
      }

      // If only one project remains, expand it
      if (updatedProjects.length === 1) {
        updatedProjects[0].isCollapsed = false
      }

      return {
        activeProjectId: newActiveProjectId,
        projects: updatedProjects,
      }
    })
  },

  removeRecentFile: (filePath: string): void => {
    set((state) => {
      const updatedRecentFiles = state.recentFiles.filter(
        (file) => file.filePath !== filePath,
      )

      // Save to storage
      setTimeout(() => {
        get().saveRecentFilesToStorage()
      }, 0)

      return {
        recentFiles: updatedRecentFiles,
      }
    })
  },

  removeTabFromProject: (projectId: string, tabId: string): void => {
    set((state) => ({
      projects: state.projects.map((project) => {
        if (project.id !== projectId) {
          return project
        }

        const updatedTabs = project.tabs.filter((tab) => tab.id !== tabId)

        // If we removed the active tab, set a new active tab
        let newActiveTabId = project.activeTabId
        if (project.activeTabId === tabId && updatedTabs.length > 0) {
          newActiveTabId = updatedTabs[0].id
        }

        return {
          ...project,
          activeTabId: newActiveTabId,
          tabs: updatedTabs,
        }
      }),
    }))
  },

  renameProject: (projectId: string, newName: string): void => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? {...project, name: newName} : project,
      ),
    }))
  },

  saveRecentFilesToStorage: (): void => {
    try {
      const state = get()
      const data = {
        files: state.recentFiles,
        version: APP_CONFIG.STORAGE_VERSION,
      }
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save recent files to storage:", error)
    }
  },

  // Active tab management
  setActiveAppPage: (appPageId: string): void => {
    const state = get()
    const appPage = state.appPages.find((page) => page.id === appPageId)

    if (!appPage) {
      console.warn(`App page with id ${appPageId} not found`)
      return
    }

    set({
      activeTab: {
        id: appPageId,
        type: "app-page",
      },
    })
  },

  setActiveProjectTab: (projectId: string, tabId: string): void => {
    const state = get()
    const project = state.getProjectById(projectId)

    if (!project) {
      console.warn(`Project with id ${projectId} not found`)
      return
    }

    const tab = project.tabs.find((t) => t.id === tabId)
    if (!tab) {
      console.warn(`Tab with id ${tabId} not found in project ${projectId}`)
      return
    }

    // Update the active tab in the project
    state.setActiveTabInProject(projectId, tabId)

    // Set the global active tab
    set({
      activeTab: {
        id: tabId,
        projectId,
        type: "project-tab",
      },
    })
  },

  setActiveTabInProject: (projectId: string, tabId: string): void => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? {...project, activeTabId: tabId} : project,
      ),
    }))
  },

  switchToProject: (projectId: string): void => {
    const state = get()
    const targetProject = state.getProjectById(projectId)

    if (!targetProject) {
      console.warn(`Project with id ${projectId} not found`)
      return
    }

    set((state) => ({
      activeProjectId: projectId,
      activeTab: {
        id: targetProject.activeTabId,
        projectId,
        type: "project-tab",
      },
      projects: state.projects.map((project) => ({
        ...project,
        isCollapsed: project.id !== projectId,
      })),
    }))
  },
}))

// Export configuration for external use
export {APP_CONFIG}
