/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiRequest} from './api';

export interface ArcWorkspaceFileProperties {
  description: string;
  filepath: string;
  name: string;
}

export interface ProjectFilePropertiesRequest {
  /** absolute path to the file on the file system that will be used to retrieve the last modification date */
  filepath: string;
}

export interface OpenProjectFileResponseData {
  /** Binary data of the .acdb file found in the same directory */
  acdbFileData?: Buffer;
  acdbFileName?: string;
  /** A flag indicating if the open file dialog was successful (true) or cancled (false) */
  cancelled: boolean;
  /** The project being opened */
  project: ArcWorkspaceFileProperties | undefined;
  /** Binary data of the workspace file */
  workspaceFileData?: Buffer;
}

export type GetProjectFileModificationDateRequest = {
  data: ProjectFilePropertiesRequest;
  requestType: ApiRequest.GetProjectFileModificationDate;
};

export type OpenProjectFileRequest = {
  data: null;
  requestType: ApiRequest.OpenProjectFile;
};

export interface SaveValidationResultsRequest {
  /** The validation results content to save */
  content: string;
  /** Default filename suggestion */
  defaultFilename?: string;
}

export interface SaveValidationResultsResponseData {
  /** A flag indicating if the save dialog was successful (true) or cancelled (false) */
  cancelled: boolean;
  /** The filepath where the file was saved */
  filepath?: string;
}

export type ShowProjectInExplorerRequest = {
  data: string;
  requestType: ApiRequest.ShowProjectFileInExplorer;
};

export type SaveValidationResultsApiRequest = {
  data: SaveValidationResultsRequest;
  requestType: ApiRequest.SaveValidationResults;
};

/** A single file to be written to disk */
export interface ProjectFile {
  /** Binary content of the file */
  fileContent: Uint8Array;
  /** Filename e.g. "project.awsp" or "project.acdb" */
  fileName: string;
  /** Absolute path to write the file.
   *  Optional — Electron computes it for secondary files (e.g. .acdb). */
  filePath?: string;
}

/** Request to save project files to disk (used for both Save and Save As) */
export interface SaveProjectFilesRequest {
  projectFiles: ProjectFile[];
}

export interface GetSaveAsProjectFilePathRequest {
  /** Default path pre-filled in the save dialog */
  defaultPath?: string;
}

export interface GetSaveAsProjectFilePathResponseData {
  cancelled?: boolean;
  error?: string;
  /** The path the user confirmed in the save dialog */
  filePath?: string;
}

export type GetSaveAsProjectFilePathApiRequest = {
  data: GetSaveAsProjectFilePathRequest;
  requestType: ApiRequest.GetSaveAsProjectFilePath;
};

export interface SaveProjectFileResponseData {
  error?: string;
}

export type SaveProjectFileApiRequest = {
  data: SaveProjectFilesRequest;
  requestType: ApiRequest.SaveProjectFile;
};

/** The superset of all File Property Requests */
export type ProjectFileApiRequestTypes =
  | GetProjectFileModificationDateRequest
  | OpenProjectFileRequest
  | ShowProjectInExplorerRequest
  | SaveValidationResultsApiRequest
  | SaveProjectFileApiRequest
  | GetSaveAsProjectFilePathApiRequest;
