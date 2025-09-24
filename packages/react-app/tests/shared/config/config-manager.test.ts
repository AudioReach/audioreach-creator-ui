import {ConfigFileManager} from "~shared/config/config-manager"
import {
  GetLayoutDefaultConfigData,
  graphDesignerLayout,
  type JSONDataMap,
} from "~shared/config/utils"

// Mock the window.configApi
const mockLoadConfigData = jest.fn()
const mockSaveConfigData = jest.fn()

beforeAll(() => {
  Object.defineProperty(window, "configApi", {
    configurable: true,
    value: {
      loadConfigData: mockLoadConfigData,
      saveConfigData: mockSaveConfigData,
    },
    writable: true,
  })
})

describe("ConfigFileManager", () => {
  let configManager: ConfigFileManager

  beforeEach(() => {
    // Reset the singleton instance before each test
    // @ts-ignore
    ConfigFileManager._instance = undefined
    configManager = ConfigFileManager.instance

    // Reset mocks
    mockLoadConfigData.mockReset()
    mockSaveConfigData.mockReset()

    // Mock console.error to prevent it from cluttering test output unless
    // explicitly tested
    jest.spyOn(console, "error").mockImplementation(() => {})
    jest.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error
    // @ts-ignore
    console.error.mockRestore()
    // @ts-ignore
    console.log.mockRestore()
  })

  it("should be a singleton instance", () => {
    const instance1 = ConfigFileManager.instance
    const instance2 = ConfigFileManager.instance
    expect(instance1).toBe(instance2)
  })

  describe("initializeConfig", () => {
    it("should load config data successfully without existing layout and add usecase layout", async () => {
      const mockConfig = {
        arcconfig: {},
        otherData: "test",
      }
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(mockConfig),
        status: true,
      })

      await configManager.initializeConfig()

      // @ts-ignore
      expect(configManager.configDataMap).toEqual({
        arcconfig: {
          layout: {
            graphDesignerView: graphDesignerLayout,
          },
        },
        otherData: "test",
      })
    })
    
    it("should load config data successfully with arcconfig and add usecase layout", async () => {
      const mockConfig = {
        arcconfig: {
          layout: {
            someOtherKey: "value",
          },
        },
        otherData: "test",
      }
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(mockConfig),
        status: true,
      })

      await configManager.initializeConfig()
      
      // @ts-ignore - Accessing private member for testing
      expect(configManager.configDataMap).toEqual({
        arcconfig: {
          layout: {
            someOtherKey: "value",
            graphDesignerView: graphDesignerLayout, // Should be added
          },
        },
        otherData: "test",
      })
      expect(mockLoadConfigData).toHaveBeenCalledTimes(1)
    })

    it("should load default config data if loadConfigData fails", async () => {
      mockLoadConfigData.mockResolvedValue({
        message: "Error loading config",
        status: false,
      })
      const defaultConfig = GetLayoutDefaultConfigData()

      await configManager.initializeConfig()

      // @ts-ignore
      expect(configManager.configDataMap).toEqual(defaultConfig)
      expect(console.error).toHaveBeenCalledWith(
        "Config data loading failed: ",
        "Error loading config",
      )
    })

    it("should load default config data if JSON parsing fails", async () => {
      mockLoadConfigData.mockResolvedValue({
        data: "invalid json",
        status: true,
      })
      const defaultConfig = GetLayoutDefaultConfigData()

      await configManager.initializeConfig()

      // @ts-ignore
      expect(configManager.configDataMap).toEqual(defaultConfig)
      expect(console.error).toHaveBeenCalled() // Expect an error from JSON.parse
    })

    it("should load default config data if data is empty", async () => {
      mockLoadConfigData.mockResolvedValue({
        data: "",
        status: true,
      })
      const defaultConfig = GetLayoutDefaultConfigData()

      await configManager.initializeConfig()

      // @ts-ignore
      expect(configManager.configDataMap).toEqual(defaultConfig)
    })

    it("should load default config data if arcconfig key is missing", async () => {
      const mockConfig = {
        otherRootKey: {},
      }
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(mockConfig),
        status: true,
      })
      const defaultConfig = GetLayoutDefaultConfigData()

      await configManager.initializeConfig()

      // @ts-ignore
      expect(configManager.configDataMap).toEqual(defaultConfig)
    })

    it("should catch and log JSON parsing errors", async () => {
      // Provide malformed JSON to trigger JSON.parse error
      mockLoadConfigData.mockResolvedValue({
        data: "{ malformed json }",
        status: true,
      })

      await configManager.initializeConfig()

      expect(console.error).toHaveBeenCalledWith(
        "Config data parsing failed: ",
        expect.any(Error),
      )
      // After catching, configDataMap should fall back to default config
      const defaultConfig = GetLayoutDefaultConfigData()
      // @ts-ignore
      expect(configManager.configDataMap).toEqual(defaultConfig)
    })
  })

  describe("getProjectConfigData and setProjectConfigData", () => {
    const projectId = "testProject1"
    const path = "project.name"
    const initialConfigData = {arcconfig: {project: {name: "oldName"}}}
    const newConfigData = "newName"

    beforeEach(async () => {
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(initialConfigData),
        status: true,
      })
      await configManager.initializeConfig()
    })

    it("should create a new ProjectConfigManager if one does not exist", () => {
      // @ts-ignore
      expect(configManager.projectConfigMap.has(projectId)).toBeFalsy()
      configManager.getProjectConfigData(projectId, path)
      // @ts-ignore
      expect(configManager.projectConfigMap.has(projectId)).toBeTruthy()
    })

    it("should return project config data", () => {
      const data = configManager.getProjectConfigData(projectId, path)
      expect(data).toBe("oldName")
    })

    it("should set project config data correctly", () => {
      configManager.getProjectConfigData(projectId, path)
      configManager.setProjectConfigData(projectId, path, newConfigData)
      const data = configManager.getProjectConfigData(projectId, path)
      expect(data).toBe(newConfigData)
    })

    it("should not set config data for a non-existent project", () => {
      const newProjectId = "newProject"
      // @ts-ignore
      expect(configManager.projectConfigMap.has(newProjectId)).toBeFalsy()
      configManager.setProjectConfigData(
        newProjectId,
        path,
        newConfigData,
      )
      // @ts-ignore
      expect(configManager.projectConfigMap.has(newProjectId)).toBeFalsy()
    })
  })

  describe("archieveProjectConfig", () => {
    const projectId = "testProjectToClose"
    const initialConfigData = {arcconfig: {project: {name: "projectConfig"}}}

    beforeEach(async () => {
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(initialConfigData),
        status: true,
      })
      await configManager.initializeConfig()
      // Ensure a ProjectConfigManager exists for the projectId
      configManager.getProjectConfigData(projectId, "some.path")
      mockSaveConfigData.mockResolvedValue({status: true})
    })

    it("should save the project config and delete it from the map", async () => {
      // @ts-ignore
      expect(configManager.projectConfigMap.has(projectId)).toBeTruthy()
      const saveSpy = jest.spyOn(configManager, "archiveProjectConfig")

      const result = await configManager.archiveProjectConfig(projectId)

      expect(result).toBeTruthy()
      expect(saveSpy).toHaveBeenCalledWith(projectId)
      // @ts-ignore
      expect(configManager.projectConfigMap.has(projectId)).toBeFalsy()
      saveSpy.mockRestore()
    })

    it("should return false and log error if project session details not found", async () => {
      const nonExistentProjectId = "nonExistent"
      const result = await configManager.archiveProjectConfig(nonExistentProjectId)
      expect(result).toBeFalsy()
      expect(console.error).toHaveBeenCalledWith(
        "No configuration data exists for Project Id:",
        "nonExistent",
      )
    })
  })

  describe("save", () => {
    const projectId1 = "proj1"
    const projectId2 = "proj2"
    const initialGlobalConfig = {arcconfig: {global: "data"}}

    beforeEach(async () => {
      // Reset configDataMap after initializeConfig
      // @ts-ignore
      ConfigFileManager._instance = undefined
      configManager = ConfigFileManager.instance

      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(initialGlobalConfig),
        status: true,
      })
      await configManager.initializeConfig()

      configManager.getProjectConfigData(projectId1, "project1");
      configManager.getProjectConfigData(projectId2, "project2");

      mockSaveConfigData.mockResolvedValue({status: true})

      // Simulate project configs being set
      configManager.setProjectConfigData(projectId1, "project1", "data")
      configManager.setProjectConfigData(projectId2, "project2", "data")
    })

    it("should save config data and delete usecase layout if projectId is not provided", async () => {
      // Set a usecase layout to ensure it"s deleted
      // @ts-ignore
      configManager.configDataMap.arcconfig.layout = {
        graphDesignerView: graphDesignerLayout,
      }

      await configManager.save()

      expect(mockSaveConfigData).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(mockSaveConfigData.mock.calls[0][0])
      expect(savedData).toEqual(
        expect.not.objectContaining({graphDesignerView: graphDesignerLayout}),
      )
      expect(savedData.arcconfig?.layout?.graphDesignerView).toBeUndefined()
      expect(console.log).toHaveBeenCalledWith("Configuration data persistently stored")
    })

    it("should save specific project config data if projectId is provided", async () => {
      // Manually set a different config for proj1 in its ProjectConfigManager
      // @ts-ignore
      configManager.setProjectConfigData(projectId1, "project1.modified", true)

      await configManager.save(projectId1)
      
      expect(mockSaveConfigData).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(mockSaveConfigData.mock.calls[0][0])
      expect(savedData.arcconfig?.project1).toBeDefined()
      expect(savedData.arcconfig?.project1?.modified).toBe(true)
      expect(console.log).toHaveBeenCalledWith("Configuration data persistently stored")
    })

    it("should handle save error gracefully", async () => {
      mockSaveConfigData.mockResolvedValue({
        message: "Save failed",
        success: false,
      })

      await configManager.save()

      expect(console.error).toHaveBeenCalledWith(
        "Failed to persist configuration. Error details:",
        "Save failed",
      )
    })

    it("should catch and log unexpected errors during save (write access denied)", async () => {
      const errorMessage = "Write access denied"
      mockSaveConfigData.mockRejectedValue(new Error(errorMessage))

      await configManager.save()

      expect(console.error).toHaveBeenCalledWith(
        "An error occurred while attempting to save configuration:",
        expect.any(Error),
      )
    })

    it("should save the last project config data if multiple project sessions exist and no projectId is provided", async () => {
      // @ts-ignore
      expect(configManager.projectConfigMap.size).toBe(2)

      await configManager.save() // Should save projectId2"s data

      expect(mockSaveConfigData).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(mockSaveConfigData.mock.calls[0][0])
      expect(savedData.arcconfig?.project2).toBeDefined()
      expect(savedData.arcconfig?.project1).toBeUndefined() // projectId1 was not the last
    })

    it("should save config if no projects are open and no projectId is provided", async () => {
      // Reset to remove any existing project managers
      // @ts-ignore
      ConfigFileManager._instance = undefined
      configManager = ConfigFileManager.instance
      const defaultData = GetLayoutDefaultConfigData()
      delete defaultData?.arcconfig?.layout?.graphDesignerView
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(defaultData),
        success: true,
      })
      await configManager.initializeConfig()
      // @ts-ignore
      expect(configManager.projectConfigMap.size).toBe(0)

      await configManager.save()

      expect(mockSaveConfigData).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(mockSaveConfigData.mock.calls[0][0])
      expect(savedData).toEqual(expect.objectContaining(defaultData))
    })

    it("should delete usecase from arcconfig.layout even if it does not exist", async () => {
      // Ensure usecaseLayout is NOT present initially
      const mockConfigWithoutUsecase = {arcconfig: {layout: {foo: "bar"}}}
      mockLoadConfigData.mockResolvedValue({
        data: JSON.stringify(mockConfigWithoutUsecase),
        success: true,
      })
      // @ts-ignore
      ConfigFileManager._instance = undefined
      configManager = ConfigFileManager.instance
      await configManager.initializeConfig() // This will add usecaseLayout

      // Now ensure it"s removed during save
      await configManager.save()

      expect(mockSaveConfigData).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(mockSaveConfigData.mock.calls[0][0])
      expect(savedData.arcconfig?.layout?.usecase).toBeUndefined()
    })
  })
})
