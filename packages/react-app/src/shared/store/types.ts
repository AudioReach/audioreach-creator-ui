import type {ReactNode} from "react"

// Base interface for application-level pages (start, settings, help, etc.)
export interface AppPage {
  component: ReactNode
  id: string
  isCloseable: boolean
  pageKey: string
  title: string
}

// Base interface for file-based project pages
export interface ProjectPage {
  activeTabId: string
  filePath: string
  id: string
  isCollapsed: boolean
  name: string
  tabs: Tab[]
}

// Tab within a Project
export interface Tab {
  component: ReactNode
  id: string
  title: string
}

// Recently opened file tracking
export interface RecentFile {
  fileName: string
  filePath: string
  lastOpened: Date
}

// Active tab tracking - can point to either AppPage or Tab within ProjectPage
export interface ActiveTab {
  id: string // AppPage.id or Tab.id
  projectId?: string // Only for project tabs - which project the tab belongs to
  type: "app-page" | "project-tab"
}

// Main application store interface
export interface ApplicationStore {
  activeProjectId: string | null
  // Active tab tracking
  activeTab: ActiveTab | null
  // Recently opened files management
  addRecentFile: (filePath: string) => void
  // Tab management within Projects
  addTabToProject: (projectId: string, tab: Tab) => void

  // Page management
  appPages: AppPage[]

  canCreateNewProject: () => boolean
  clearRecentFiles: () => void

  closeAppPage: (pageKey: string) => void
  // Project management
  createProject: (filePath: string, name?: string) => string
  createProjectFromRecentFile: (filePath: string) => string | null

  // Navigation
  getActiveProject: () => ProjectPage | null
  getActiveTab: () => ActiveTab | null
  getActiveTabContent: () => AppPage | Tab | null
  getProjectById: (projectId: string) => ProjectPage | null
  getRecentFiles: () => RecentFile[]

  // Dynamic tab visibility (key feature)
  getVisibleTabs: () => (AppPage | ProjectPage | Tab)[]
  // App lifecycle
  initializeApp: () => void
  isAppPageOpen: (pageKey: string) => boolean

  isProjectAlreadyOpen: (filePath: string) => ProjectPage | null

  // Persistence
  loadRecentFilesFromStorage: () => void
  maxProjects: number
  maxRecentFiles: number
  // App page management
  openStartPage: () => void

  projects: ProjectPage[]
  // Recently opened files
  recentFiles: RecentFile[]
  removeProject: (projectId: string) => void
  removeRecentFile: (filePath: string) => void

  removeTabFromProject: (projectId: string, tabId: string) => void
  renameProject: (projectId: string, newName: string) => void
  saveRecentFilesToStorage: () => void
  // Active tab management
  setActiveAppPage: (appPageId: string) => void

  setActiveProjectTab: (projectId: string, tabId: string) => void

  setActiveTabInProject: (projectId: string, tabId: string) => void
  switchToProject: (projectId: string) => void
}

// Configuration interface
export interface ApplicationConfig {
  AUTO_COLLAPSE_ON_NEW_PROJECT: boolean
  DEFAULT_PROJECT_NAME_PATTERN: (filename: string) => string
  MAX_PROJECTS: number
  MAX_RECENT_FILES: number
  STORAGE_VERSION: string
}

// Type guards for distinguishing page types
export const isAppPage = (
  item: AppPage | ProjectPage | Tab,
): item is AppPage => {
  return "pageKey" in item
}

export const isProjectPage = (
  item: AppPage | ProjectPage | Tab,
): item is ProjectPage => {
  return "filePath" in item && "tabs" in item
}

export const isTab = (item: AppPage | ProjectPage | Tab): item is Tab => {
  return !("pageKey" in item) && !("filePath" in item)
}
