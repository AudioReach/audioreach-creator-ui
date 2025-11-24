import type {ReactNode} from "react"

import type {IJsonModel} from "flexlayout-react"

//ProjectLayout Manager types and interfaces

// Tab close callback type
export type OnTabClose = (
  tabId: string,
  tabName: string,
) => Promise<boolean> | boolean

// Project close callback type
export type OnProjectClose = (tabId: string, tabName: string) => void

// Project group close callback type
export type OnGroupClose = (
  groupId: string,
  groupName: string,
) => Promise<boolean> | boolean

// Panel tab type
// Individual tab within a panel (id, title, component)
// Example: A "Files" tab, "Search" tab, or "Terminal" tab
export interface PanelTabInterface {
  component: ReactNode
  id: string
  onProjectClose?: OnProjectClose //cleanup callback when project closes
  onTabClose?: OnTabClose //return true if the tab can close, false if not
  title: string
}

// Layout manager interface for type safety
// Defines the contract for the FlexLayout tab manager
export interface PanelTabManagerInterface {
  removePanelTabComponent(tabId: string): void
  setPanelTabComponent(tabId: string, component: ReactNode): void
}

// Layout data structure for project tabs containing FlexLayout configuration
export type ProjectTabLayout = {
  flexLayoutData: IJsonModel //  FlexLayout JSON storage
}

//TabLayout Manager types and interfaces
// Enum to classify different types of tabs in the system
export enum TabType {
  AppTab,
  ProjectTab,
  ProjectMainTab,
}

// Base interface for all tab types with common properties
export interface BaseTabInterface {
  id: string
  onTabClose?: OnTabClose //return true if the tab can close, false if not
  tabType: TabType
  title: string
}
// Application-level tabs (start, settings, help, etc.)
export interface AppTabInterface extends BaseTabInterface {
  component: ReactNode
  onAppClose?: OnTabClose //return true if the tab can close, false if not
}

// Main tab within a project (closes all tabs in the group)
export interface ProjectBaseTabInterface extends BaseTabInterface {
  panelLayout?: ProjectTabLayout // Made optional - if null, it's a simple tab
}
export interface ProjectMainTabInterface extends ProjectBaseTabInterface {
  panelLayout: ProjectTabLayout // Main tab always requires layout
}
// Additional tabs within a project (closeable)
export interface ProjectTabInterface extends ProjectBaseTabInterface {
  component?: ReactNode // For simple tabs without layout
  onProjectClose?: OnProjectClose //cleanup callback when project closes
}

// Enum to distinguish between application and project tab groups
export enum TabGroupType {
  AppGroup,
  ProjectGroup,
}
// Container for all application-level tabs (shared across all projects)
export interface TabGroupInterface {
  activeTabId: string | null
  groupType: TabGroupType
  id: string
  isCollapsed: boolean
  onClose?: OnGroupClose // callback for group closing confirmation
  title: string
}

export interface AppGroupInterface extends TabGroupInterface {
  appTabs: AppTabInterface[] // Single array for all app tabs (minimum 1 required)
  colorId: number // Permanent color assignment (1-20)
}

// Container for project-specific content
export interface ProjectGroupInterface extends TabGroupInterface {
  colorId: number
  description: string | null
  mainTab: ProjectMainTabInterface
  projectKey: string //To prevent if a file/ device already opened
  projectTabs: ProjectTabInterface[]
}

// Enum defining panel positions within the FlexLayout system
export enum PanelID {
  CenterPanel,
  TopPanel,
  BottomPanel,
  LeftPanel,
  RightPanel,
}

// Main application store interface
export interface ProjectLayoutStoreInterface {
  activeTab: BaseTabInterface | null
  activeTabGroup: TabGroupInterface | null
  // Add AppTab to the application group
  addAppTab: (appGroupID: string, appTab: AppTabInterface) => boolean
  // Panel methods from PanelStore
  addPanelTab: (
    tabId: string,
    panelId: PanelID,
    panelTab: PanelTabInterface,
  ) => boolean
  // Tab management within Project Groups
  addTabToProjectGroup: (
    projectGroupId: string,
    tab: ProjectTabInterface,
  ) => void
  appGroups: AppGroupInterface[] // Array of all application groups
  // Close specific app tab with confirmation
  closeAppTab: (appTabID: string) => void

  componentRegistry: Map<string, ReactNode> //Map of panel tab ID to React component
  // Create new application group with initial tabs
  createAppGroup: (
    Id: string,
    title: string,
    initialTabs: AppTabInterface[], // Array of initial tabs (minimum 1 required)
    onClose?: OnGroupClose,
  ) => boolean

  //  Panel methods from Store
  // Create layout from JSON configuration
  createLayoutConfigFromJSON: (
    projectGroupId: string,
    layoutConfigJSON: string,
  ) => boolean
  // Create new project group
  createProjectGroup: (
    Id: string,
    projectKey: string,
    title: string,
    mainTab: ProjectMainTabInterface,
    description?: string,
    onClose?: OnGroupClose,
  ) => boolean

  // Expand tab group and collapse others (accordion behavior)
  expandTabGroup: (projectGroupId: string) => void

  // Get currently active project group
  getActiveProjectGroup: () => ProjectGroupInterface | null
  // Get currently active tab (app or project)
  getActiveProjectTab: () => AppTabInterface | ProjectBaseTabInterface | null
  // Get layout configuration for specific project
  getLayout: (projectGroupId: string) => ProjectTabLayout | null

  //Layout config as JSON
  getLayoutConfig: (projectGroupId: string) => string | null

  // Find project group by ID
  getProjectGroupById: (projectGroupId: string) => ProjectGroupInterface | null

  // Dynamic tab visibility
  getVisibleTabs: () => (
    | ProjectGroupInterface
    | AppTabInterface
    | ProjectBaseTabInterface
  )[]
  // App lifecycle
  // Initialize application state
  initializeApp: () => void

  // Check if app tab with given key is currently open
  isAppTabOpen: (tabKey: string) => boolean
  // Check if project with given key is already open
  isProjectGroupAlreadyOpen: (
    projectKey: string,
  ) => ProjectGroupInterface | null

  nextColorId: number // Track next available color ID (1-20, cycles)
  panelTabRegistry: Map<string, PanelTabInterface> //Map of PanelTabID and PanelTab object

  previousActiveProjectGroupId: string | null // Tracks last active project group for fallback when groups are closed

  projectGroups: ProjectGroupInterface[] // Array of all project groups

  projectTabLayouts: Map<string, ProjectTabLayout> //Map of tabid and projectlayout

  removeAppGroup: (appGroupId: string) => void // Remove entire app group and all its tabs
  removePanelTab: (projectGroupId: string, tabId: string) => boolean // Remove panel tab from project layout
  removeProjectGroup: (projectGroupId: string) => boolean // Remove entire project group and return success status
  removeProjectTab: (projectGroupId: string, tabId: string) => boolean // Remove specific tab from project group
  renameProjectGroup: (projectGroupId: string, newName: string) => boolean // Change project group display name
  // Save FlexLayout configuration as JSON string
  saveLayoutConfig: (
    projectGroupId: string,
    layoutConfigJSON: string,
  ) => boolean

  // Active tab management
  setActiveAppTab: (appTabId: string) => boolean // Set specific app tab as active
  setActivePanelTabById: (tabId: string) => boolean // Set specific panel tab as active

  setActiveProjectTab: (projectGroupId: string, tabId: string) => boolean // Set specific project tab as active

  setActiveTabInProjectGroup: (projectGroupId: string, tabId: string) => boolean // Update active tab within a project group

  // Group title display control
  setShowGroupTitle: (show: boolean) => void // Control whether to show tooltips on group headers
  showGroupTitle: boolean // false = show tooltip on hover (default), true = no tooltip
  switchToProjectGroup: (projectGroupId: string) => boolean // Switch focus to specific project group
  tabGroups: Map<string, TabGroupInterface> //Map of GroupID and TabGroup
  // Panel tab component management
  updatePanelTabComponent: (tabId: string, newComponent: ReactNode) => boolean
}

// Internal configuration interface
export type ApplicationConfig = {
  AUTO_COLLAPSE_ON_NEW_PROJECT: boolean
  DEFAULT_PROJECT_NAME_PATTERN: (title: string) => string
  MAX_PROJECT_GROUPS: number
  STORAGE_VERSION: string
}
