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

  private constructor() {
    this.configDataMap = {}
    this.projectConfigMap = new Map<string, JSONDataMap>()
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
      console.error("No configuration data exists for Project Id:", projectId)
      return false
    }

    const result = await this.save(projectId)
    this.projectConfigMap.delete(projectId)
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
      console.log("Project created with ID: ", projectId)
    }

    return getConfigData(projectConfig, path, this.rootKey)
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
        console.error("Config data loading failed: ", result.message)
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
      console.error("Config data parsing failed: ", error)
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
        console.log("Configuration data persistently stored")
        return true
      } else {
        console.error(
          "Failed to persist configuration. Error details:",
          res.message,
        )
        return false
      }
    } catch (error) {
      console.error(
        "An error occurred while attempting to save configuration:",
        error,
      )
      return false
    }
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
      console.log("No configuration data exists for Project Id: ${projectId}")
      return false
    }
  }
}
