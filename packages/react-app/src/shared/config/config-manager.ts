import {logger} from "../lib/logger"
import {deepEqual} from "../utils/deep-equality"

import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "./user-preferences-types"
import {
  getConfigData,
  GetLayoutDefaultConfigData,
  graphDesignerLayout,
  type JSONDataMap,
  setConfigData,
} from "./utils"

export class ConfigFileManager {
  private static _instance: ConfigFileManager
  private configDataMap: JSONDataMap

  private projectConfigMap: Map<string, JSONDataMap>
  private readonly rootKey: string = "arcconfig"
  private userPreferencesCache: Map<string, UserPreferences>

  private constructor() {
    this.configDataMap = {}
    this.projectConfigMap = new Map<string, JSONDataMap>()
    this.userPreferencesCache = new Map<string, UserPreferences>()
  }

  static get instance(): ConfigFileManager {
    if (!this._instance) {
      this._instance = new ConfigFileManager()
    }
    return this._instance
  }

  /**
   * Archives a project's configuration by saving it to the config file
   * and removing it from the in-memory map.
   *
   * @param projectId - ID of the project to save and delete.
   * @returns Promise resolving to true if archived, false otherwise.
   */
  async archiveProjectConfig(projectId: string): Promise<boolean> {
    const projectConfig = this.projectConfigMap.get(projectId)
    if (projectConfig === undefined) {
      logger.error("No configuration data exists for project", {
        action: "archive_project_config",
        component: "ConfigFileManager",
        error: "Project config not found",
        projectId,
      })
      return false
    }

    const result = await this.save(projectId)
    if (result) {
      this.projectConfigMap.delete(projectId)
      // Invalidate preferences cache for this project
      this.userPreferencesCache.delete(projectId)
    }
    return result
  }

  private ensureGraphDesignerViewLayout() {
    if (!this.configDataMap.arcconfig?.layout?.graphDesignerView) {
      this.configDataMap.arcconfig = this.configDataMap.arcconfig || {}
      this.configDataMap.arcconfig.layout =
        this.configDataMap.arcconfig.layout || {}
      this.configDataMap.arcconfig.layout.graphDesignerView =
        graphDesignerLayout
    }
  }

  /**
   * Gets the global theme preference (not project-specific)
   * @returns The theme value ('light' | 'dark') or default 'light'
   */
  getGlobalTheme(): "light" | "dark" {
    const theme = getConfigData(
      this.configDataMap,
      "globalPreferences.theme",
      this.rootKey,
    )
    // Validate and log if invalid value found
    if (theme !== "dark" && theme !== "light" && theme !== undefined) {
      logger.warn("Invalid theme value in config, defaulting to light", {
        action: "get_global_theme",
        component: "ConfigFileManager",
      })
    }
    // Ensure only valid values are returned
    return theme === "dark" ? "dark" : "light"
  }

  /**
   * Retrieves the configuration data for the given project ID.
   * If no project exists, initializes a new project configuration.
   *
   * @param projectId - ID of the project to retrieve or create.
   * @param path - File path to read the configuration data.
   * @returns The project configuration data.
   */
  getProjectConfigData(projectId: string, path: string): any {
    let projectConfig = this.projectConfigMap.get(projectId)
    if (projectConfig === undefined) {
      // Deep copy to avoid mutation, changes to below obj doesn't affect the original data
      projectConfig = JSON.parse(
        JSON.stringify(this.configDataMap),
      ) as JSONDataMap
      this.projectConfigMap.set(projectId, projectConfig)
      logger.verbose("Project config created", {
        action: "create_project_config",
        component: "ConfigFileManager",
        projectId,
      })
    }

    return getConfigData(projectConfig, path, this.rootKey)
  }

  /**
   * Retrieves user preferences for the specified project.
   * If preferences don't exist, returns default preferences.
   * Uses memoization to return the same object reference when preferences haven't changed.
   *
   * @param projectId - ID of the project to retrieve preferences for.
   * @returns The user preferences for the project.
   */
  getUserPreferences(projectId: string): UserPreferences {
    const projectConfig = this.projectConfigMap.get(projectId)
    if (!projectConfig) {
      logger.verbose(
        "No configuration data exists for project, returning defaults",
        {
          action: "get_user_preferences",
          component: "ConfigFileManager",
          projectId,
        },
      )
      return DEFAULT_USER_PREFERENCES
    }

    const preferences = getConfigData(
      projectConfig,
      "userPreferences",
      this.rootKey,
    )

    // If preferences don't exist or are incomplete, merge with defaults
    if (!preferences) {
      return DEFAULT_USER_PREFERENCES
    }

    const newPreferences: UserPreferences = {
      display: {
        ...DEFAULT_USER_PREFERENCES.display,
        ...preferences.display,
      },
      usecases: {
        ...DEFAULT_USER_PREFERENCES.usecases,
        ...preferences.usecases,
      },
      visualization: {
        ...DEFAULT_USER_PREFERENCES.visualization,
        ...preferences.visualization,
      },
    }

    // Check cache for existing preferences
    const cachedUserPreferences = this.userPreferencesCache.get(projectId)

    // If cached preferences exist and are equal to new preferences,
    // return the cached object to maintain reference equality
    if (
      cachedUserPreferences &&
      deepEqual(cachedUserPreferences, newPreferences)
    ) {
      return cachedUserPreferences
    }

    // Update cache with new preferences
    this.userPreferencesCache.set(projectId, newPreferences)
    return newPreferences
  }

  /**
   * Loads configuration data from the config file and parses it into JSONDataMap format.
   * If parsing fails due to an error, default configuration data is initialized instead.
   */
  async initializeConfig(): Promise<void> {
    let isConfigSet = false
    try {
      const result = await window.configApi.loadConfigData()
      if (!result.status) {
        logger.error("Config data loading failed", {
          action: "initialize_config",
          component: "ConfigFileManager",
          error: result.message,
        })
        return
      }

      const jsonData = result.data?.trim() ? JSON.parse(result.data) : null
      // arcconfig is the root key
      if (jsonData?.arcconfig) {
        this.configDataMap = jsonData
        // Add graphdesigner layout
        this.ensureGraphDesignerViewLayout()
        isConfigSet = true
      }
    } catch (error) {
      logger.error("Config data parsing failed", {
        action: "initialize_config",
        component: "ConfigFileManager",
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (!isConfigSet) {
        this.configDataMap = GetLayoutDefaultConfigData()
      }
    }
  }

  /**
   * Saves project configuration data to the config file.
   * If a valid project ID is provided and found, the config data is replaced with the project's data and saved.
   * If project ID is not provided, the last available project configuration is saved.
   * If no valid project is found or no projects are available, the original config data is saved as fallback.
   */
  async save(projectId?: string): Promise<boolean> {
    try {
      if (projectId) {
        const projectConfig = this.projectConfigMap.get(projectId)
        if (projectConfig) {
          this.configDataMap = projectConfig
        }
      } else {
        if (this.projectConfigMap.size > 0) {
          const lastProjectId = Array.from(this.projectConfigMap.keys()).pop()
          const lastProjectConfig =
            lastProjectId !== undefined
              ? this.projectConfigMap.get(lastProjectId)
              : undefined
          if (lastProjectConfig !== undefined) {
            this.configDataMap = lastProjectConfig
          }
        }
      }

      // delete usecase from arcconfig.layout
      delete this.configDataMap?.arcconfig?.layout?.graphDesignerView

      // output JSON string should be formatted with an indentation of 2 spaces
      const space: number = 2
      const res = await window.configApi.saveConfigData(
        JSON.stringify(this.configDataMap, null, space),
      )
      if (res.status) {
        logger.verbose("Configuration data persistently stored", {
          action: "save_config",
          component: "ConfigFileManager",
          projectId,
        })
        return true
      } else {
        logger.error("Failed to persist configuration", {
          action: "save_config",
          component: "ConfigFileManager",
          error: res.message,
          projectId,
        })
        return false
      }
    } catch (error) {
      logger.error("Error occurred while saving configuration", {
        action: "save_config",
        component: "ConfigFileManager",
        error: error instanceof Error ? error.message : String(error),
        projectId,
      })
      return false
    }
  }

  /**
   * Sets the global theme preference (not project-specific)
   * @param theme - The theme to set ('light' | 'dark')
   */
  setGlobalTheme(theme: "light" | "dark"): void {
    setConfigData(
      this.configDataMap,
      "globalPreferences.theme",
      theme,
      this.rootKey,
    )
  }

  /**
   * Sets new configuration data for the specified project at the given path.
   *
   * @param projectId - ID of the project to update or add.
   * @param path - Path where the configuration data should be stored.
   * @param newConfigData - The new configuration data to be saved.
   * @returns `true` if the data was successfully set, `false` otherwise.
   */
  setProjectConfigData(
    projectId: string,
    path: string,
    newConfigData: any,
  ): boolean {
    const projectConfig = this.projectConfigMap.get(projectId)
    if (projectConfig) {
      setConfigData(projectConfig, path, newConfigData, this.rootKey)
      return true
    } else {
      logger.verbose("No configuration data exists for project", {
        action: "set_project_config",
        component: "ConfigFileManager",
        projectId,
      })
      return false
    }
  }

  /**
   * Sets a specific user preference value for the specified project.
   *
   * @param projectId - ID of the project to update preferences for.
   * @param path - Dot-notation path to the preference (e.g., 'visualization.showControlLinks').
   * @param value - The new value for the preference.
   * @returns `true` if the preference was successfully set, `false` otherwise.
   */
  setUserPreference(projectId: string, path: string, value: any): boolean {
    const projectConfig = this.projectConfigMap.get(projectId)
    if (!projectConfig) {
      logger.verbose("No configuration data exists for project", {
        action: "set_user_preference",
        component: "ConfigFileManager",
        projectId,
      })
      return false
    }

    // Ensure userPreferences exists
    if (!projectConfig[this.rootKey]?.userPreferences) {
      if (!projectConfig[this.rootKey]) {
        projectConfig[this.rootKey] = {}
      }
      projectConfig[this.rootKey].userPreferences = DEFAULT_USER_PREFERENCES
    }

    setConfigData(projectConfig, `userPreferences.${path}`, value, this.rootKey)

    // Invalidate cache since preferences have changed
    this.userPreferencesCache.delete(projectId)

    logger.verbose("User preference updated", {
      action: "set_user_preference",
      component: "ConfigFileManager",
      projectId,
    })

    return true
  }
}
