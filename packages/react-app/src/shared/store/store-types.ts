import type {ReactNode} from "react"

import type {UsecaseCategory} from "~shared/controls/usecase-selection-control/ui/types"

export type ProjectGroupCloseCallback = (
  groupId: string,
  groupName: string,
) => Promise<boolean> | boolean

// Base interface for application-level tabs (start, settings, help, etc.)
export interface AppTab {
  component: ReactNode
  id: string
  isCloseable: boolean
  tabKey: string
  title: string
}

// Container for all application-level tabs (shared across all projects)
export interface AppGroup {
  appTabs: AppTab[]
  id: string
  isCollapsed: boolean
  name: string
}

// Main tab within a project (non-closeable)
export interface MainTab {
  component: ReactNode
  id: string
  title: string
}

// Additional tabs within a project (closeable)
export interface ProjectTab {
  component: ReactNode
  id: string
  title: string
}

// Container for project-specific content
export interface ProjectGroup {
  activeTabId: string
  filePath: string
  id: string
  isCollapsed: boolean
  mainTab: MainTab
  name: string
  onClose?: ProjectGroupCloseCallback // callback for group closing confirmation
  projectTabs: ProjectTab[]
  usecaseData?: UsecaseCategory[] // Usecase data fetched from backend
}

// Recently opened project tracking
export interface RecentProject {
  fileName: string
  filePath: string
  lastOpened: Date
}

// Active tab tracking - can point to AppTab, MainTab, or ProjectTab
export interface ActiveTab {
  id: string // AppTab.id, MainTab.id, or ProjectTab.id
  projectGroupId?: string // Only for main-tab and project-tab - which project group the tab belongs to
  type: "app-tab" | "main-tab" | "project-tab"
}

// Main application store interface
export interface ApplicationStore {
  activeProjectGroupId: string | null
  // Active tab tracking
  activeTab: ActiveTab | null
  // Add AppTab to the application group
  addAppTab: (appTab: AppTab) => void
  // Tab management within Project Groups
  addTabToProjectGroup: (projectGroupId: string, tab: ProjectTab) => void

  // Single app group containing all application-level tabs
  appGroup: AppGroup

  canCreateNewProjectGroup: () => boolean

  closeAppTab: (tabKey: string) => void

  // Project Group management
  // Store method matches what manager expects
  createProjectGroup: (
    filePath: string,
    name?: string,
    projectId?: string,
    onClose?: ProjectGroupCloseCallback,
  ) => string
  expandProjectGroupAccordion: (projectGroupId: string) => void

  // Navigation
  getActiveProjectGroup: () => ProjectGroup | null
  getActiveTab: () => ActiveTab | null
  getActiveTabContent: () => AppTab | MainTab | ProjectTab | null
  getProjectGroupById: (projectGroupId: string) => ProjectGroup | null

  // Dynamic tab visibility (key feature)
  getVisibleTabs: () => (AppTab | ProjectGroup | MainTab | ProjectTab)[]
  // App lifecycle
  initializeApp: () => void
  isAppTabOpen: (tabKey: string) => boolean

  isProjectGroupAlreadyOpen: (filePath: string) => ProjectGroup | null

  maxProjectGroups: number

  previousActiveProjectGroupId: string | null
  projectGroups: ProjectGroup[]

  removeProjectGroup: (projectGroupId: string) => void
  removeTabFromProjectGroup: (projectGroupId: string, tabId: string) => void
  renameProjectGroup: (projectGroupId: string, newName: string) => void

  // Active tab management
  setActiveAppTab: (appTabId: string) => void

  setActiveProjectTab: (projectGroupId: string, tabId: string) => void
  setActiveTabInProjectGroup: (projectGroupId: string, tabId: string) => void
  switchToProjectGroup: (projectGroupId: string) => void
  updateProjectGroupUsecaseData: (
    projectGroupId: string,
    usecaseData: UsecaseCategory[],
  ) => void
}

// Configuration interface
export interface ApplicationConfig {
  AUTO_COLLAPSE_ON_NEW_PROJECT: boolean
  DEFAULT_PROJECT_NAME_PATTERN: (filename: string) => string
  MAX_PROJECT_GROUPS: number
  STORAGE_VERSION: string
}

// Type guards for distinguishing tab and group types
export const isAppTab = (
  item: AppTab | ProjectGroup | MainTab | ProjectTab,
): item is AppTab => {
  return "tabKey" in item
}

export const isProjectGroup = (
  item: AppTab | ProjectGroup | MainTab | ProjectTab,
): item is ProjectGroup => {
  return "filePath" in item && "mainTab" in item && "projectTabs" in item
}

export const isMainTab = (
  item: AppTab | ProjectGroup | MainTab | ProjectTab,
): item is MainTab => {
  return (
    "component" in item &&
    !("tabKey" in item) &&
    !("filePath" in item) &&
    !("projectTabs" in item)
  )
}

export const isProjectTab = (
  item: AppTab | ProjectGroup | MainTab | ProjectTab,
): item is ProjectTab => {
  return (
    "component" in item &&
    !("tabKey" in item) &&
    !("filePath" in item) &&
    !("mainTab" in item) &&
    !("projectTabs" in item)
  )
}
