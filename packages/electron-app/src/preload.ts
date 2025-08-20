import type {
  ApiRequestType,
  ApiResponse,
  ElectronApi,
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
