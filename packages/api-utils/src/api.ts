import type {ProjectFileApiRequestTypes} from "./project-file-api-types"

export enum ApiRequest {
  GetProjectFileModificationDate = "file-prop-get-mod-date",
  OpenProjectFile = "open-project-file",
  ShowProjectFileInExplorer = "show-project-file-in-explorer",
}

/**
 * Discriminated unions in TypeScript are used to represent a value that could be
 * one of a few different types. They are a way of adding more information to a union
 * type, so that the compiler can know which type of value is actually being used.
 * also see: packages/electron-app/main.ts
 */
export type ApiRequestType = ProjectFileApiRequestTypes

export type ApiResponse = {
  data?: any
  message: string
  requestType: ApiRequest
}

export interface Versions {
  chromeVersion: () => string
  electronVersion: () => string
  nodeVersion: () => string
}

export interface ElectronApi {
  send: (request: ApiRequestType) => Promise<ApiResponse>
  versions: Versions
}

export type WindowWithApi = Window & {api: ElectronApi}

export interface ConfigResult {
  data?: string
  message: string
  status: boolean
}

export interface ConfigApi {
  loadConfigData: () => Promise<ConfigResult>
  saveConfigData: (data: string) => Promise<ConfigResult>
}
