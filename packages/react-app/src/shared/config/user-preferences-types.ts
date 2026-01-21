/**
 * User preferences for visualization settings
 */
export interface VisualizationPreferences {
  expandSubgraphs: boolean
  highlightPPModules: boolean
  showContainerIds: boolean
  showControlLinks: boolean
  showDanglingLinks: boolean
  showModuleInstanceIds: boolean
  showSubgraphIds: boolean
  simplifySubsystems: boolean
}

/**
 * User preferences for display settings
 */
export interface DisplayPreferences {
  portVisibilityMode: "all" | "active"
}

/**
 * User preferences for usecase settings
 */
export interface UsecasePreferences {
  mode: "default" | "usecases-only" | "subsystems-only"
  namePreference: "alias" | "keyvalues" | "values"
  selectedUsecases: string[]
}

/**
 * Complete user preferences structure
 */
export interface UserPreferences {
  display: DisplayPreferences
  usecases: UsecasePreferences
  visualization: VisualizationPreferences
}

/**
 * Default visualization preferences
 */
export const DEFAULT_VISUALIZATION_PREFERENCES: VisualizationPreferences = {
  expandSubgraphs: false,
  highlightPPModules: false,
  showContainerIds: false,
  showControlLinks: true,
  showDanglingLinks: true,
  showModuleInstanceIds: false,
  showSubgraphIds: false,
  simplifySubsystems: false,
}

/**
 * Default display preferences
 */
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  portVisibilityMode: "active",
}

/**
 * Default usecase preferences
 */
export const DEFAULT_USECASE_PREFERENCES: UsecasePreferences = {
  mode: "default",
  namePreference: "alias",
  selectedUsecases: [],
}

/**
 * Default user preferences (all categories)
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  display: DEFAULT_DISPLAY_PREFERENCES,
  usecases: DEFAULT_USECASE_PREFERENCES,
  visualization: DEFAULT_VISUALIZATION_PREFERENCES,
}
