import type {ApiRequest} from "./api"

export interface ArcWorkspaceFileProperties {
  description: string
  filepath: string
  name: string
}

export interface ProjectFilePropertiesRequest {
  /** absolute path to the file on the file system that will be used to retrieve the last modification date */
  filepath: string
}

export interface OpenProjectFileResponseData {
  /** A flag indicating if the open file dialog was successful (true) or cancled (false) */
  cancelled: boolean
  /** The project being opened */
  project: ArcWorkspaceFileProperties | undefined
}

export type GetProjectFileModificationDateRequest = {
  data: ProjectFilePropertiesRequest
  requestType: ApiRequest.GetProjectFileModificationDate
}

export type OpenProjectFileRequest = {
  data: null
  requestType: ApiRequest.OpenProjectFile
}

export type ShowProjectInExplorerRequest = {
  data: string
  requestType: ApiRequest.ShowProjectFileInExplorer
}

/** The superset of all File Property Requests */
export type ProjectFileApiRequestTypes =
  | GetProjectFileModificationDateRequest
  | OpenProjectFileRequest
  | ShowProjectInExplorerRequest
