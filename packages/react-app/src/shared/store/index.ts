// Application store exports
export {useApplicationStore, APP_CONFIG} from "./application-store"

// Project Layout store exports
export {
  useProjectLayoutStore,
  AppTab,
  ProjectMainTab,
  ProjectTab,
  PanelTab,
  APP_CONFIG as PROJECT_LAYOUT_CONFIG,
} from "./ProjectLayoutMgr.store"

// Type exports
export type {
  ApplicationStore,
  ApplicationConfig,
  AppGroup,
  MainTab,
  ProjectGroup,
  RecentProject,
  ActiveTab,
} from "./store-types"

export type {
  ProjectLayoutStoreInterface,
  AppGroupInterface,
  AppTabInterface,
  ProjectGroupInterface,
  ProjectMainTabInterface,
  ProjectTabInterface,
  PanelTabInterface,
} from "./ProjectLayoutMgr.interface"

// Type guard exports
export {isAppTab, isProjectGroup, isMainTab, isProjectTab} from "./store-types"
