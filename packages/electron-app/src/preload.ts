import type {
  ApiRequestType,
  ApiResponse,
  ConfigApi,
  ConfigResult,
  ElectronApi,
  MruProjectInfo,
  MruStoreApi,
} from "@audioreach-creator-ui/api-utils"
import {contextBridge, ipcRenderer} from "electron"

const api: ElectronApi = {
  send: (request: ApiRequestType): Promise<ApiResponse> => {
    return ipcRenderer.invoke("ipc::message", request)
  },
  versions: {
    chromeVersion: () => process.versions.chrome || "",
    electronVersion: () => process.versions.electron || "",
    nodeVersion: () => process.versions.node || "",
  },
}

contextBridge.exposeInMainWorld("api", api)

const configApi: ConfigApi = {
  loadConfigData: () =>
    ipcRenderer.invoke("load-config-data") as Promise<ConfigResult>,
  saveConfigData: (data: string) =>
    ipcRenderer.invoke("save-config-data", data) as Promise<ConfigResult>,
}

contextBridge.exposeInMainWorld("configApi", configApi)

const mruStoreApi: MruStoreApi = {
  addProject: (project: MruProjectInfo) =>
    ipcRenderer.invoke("mru:add-project", project) as Promise<boolean>,
  clearAll: () => ipcRenderer.invoke("mru:clear-all") as Promise<boolean>,
  getRecentProjects: () =>
    ipcRenderer.invoke("mru:get-recent-projects") as Promise<MruProjectInfo[]>,
  getStorePath: () =>
    ipcRenderer.invoke("mru:get-store-path") as Promise<string>,
  removeProject: (projectId: string) =>
    ipcRenderer.invoke("mru:remove-project", projectId) as Promise<boolean>,
  updateProjectImage: (projectId: string, image: string) =>
    ipcRenderer.invoke(
      "mru:update-project-image",
      projectId,
      image,
    ) as Promise<boolean>,
}

contextBridge.exposeInMainWorld("mruStoreApi", mruStoreApi)
