// example third-party module
import {camelCase} from "change-case"

import type {ProjectFileApiRequestTypes} from "./project-file-api-types"

export enum ApiRequest {
  Request1 = "request-1",
  Request2 = "request-2",
  CamelCase = "camel-case",
  SelectDirectory = "select-directory",
  LoadXmlsFromDirectory = "load-xmls-from-directory",
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
export type ApiRequestType =
  | {
      // the compiler can infer the structure of the data based on the value of the
      // requestType
      data: {someObj: {message: string}}
      requestType: ApiRequest.Request1
    }
  | {
      data: {someOtherObj: {max: number; min: number}}
      requestType: ApiRequest.Request2
    }
  | CamelCaseRequestType
  | SelectDirectoryRequestType
  | LoadXmlsFromDirectoryRequestType
  | ProjectFileApiRequestTypes

export type CamelCaseRequestType = {
  data: {input: string}
  requestType: ApiRequest.CamelCase
}

export type SelectDirectoryRequestType = {
  data: {}
  requestType: ApiRequest.SelectDirectory
}

export type LoadXmlsFromDirectoryRequestType = {
  data: {directoryPath: string}
  requestType: ApiRequest.LoadXmlsFromDirectory
}

export type ApiResponse = {
  data?: any
  message: string
  requestType: ApiRequest
}

export type DirectorySelectionResponse = {
  data: {
    cancelled: boolean
    directoryPath: string | null
  }
  message: string
  requestType: ApiRequest.SelectDirectory
}

export type XmlLoadResponse = {
  data: {
    error?: string
    moduleCount: number
    success: boolean
    xmlFiles: string[]
  }
  message: string
  requestType: ApiRequest.LoadXmlsFromDirectory
}

export interface Versions {
  chromeVersion: () => string
  electronVersion: () => string
  nodeVersion: () => string
}

export const camelCaseInput = (input: string): string => camelCase(input)

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
