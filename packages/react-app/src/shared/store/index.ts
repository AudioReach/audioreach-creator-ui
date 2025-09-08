// Application store exports
export {useApplicationStore, APP_CONFIG} from "./application-store"

// Type exports
export type {
  ApplicationStore,
  ApplicationConfig,
  AppTab,
  AppGroup,
  MainTab,
  ProjectTab,
  ProjectGroup,
  RecentProject,
  ActiveTab,
} from "./store-types"

// Type guard exports
export {isAppTab, isProjectGroup, isMainTab, isProjectTab} from "./store-types"
