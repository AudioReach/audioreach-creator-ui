/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ArcWorkspaceFileProperties,
  GetSaveAsProjectFilePathResponseData,
  OpenProjectFileResponseData,
  ProjectFile,
  SaveProjectFileResponseData,
  SaveValidationResultsRequest,
  SaveValidationResultsResponseData,
} from '@audioreach-creator-ui/api-utils/';
import {dialog, shell} from 'electron';
import {readFileSync, statSync, writeFileSync} from 'node:fs';
import {readdir, writeFile} from 'node:fs/promises';
import {basename, dirname, join} from 'node:path';

export function getFileModificationDateSync(path: string): Date | undefined {
  try {
    const stats = statSync(path);
    return stats.mtime; // This is the modification time
  } catch (error) {
    console.error('Error getting file creation date:', error);
  }
  return undefined;
}

export function showProjectInExplorer(filepath: string) {
  shell.showItemInFolder(filepath);
}

// #region Open file Test APIs
/** Used for initially testing Open File on dummy project data. */
export async function openProjectFile(
  win: Electron.BaseWindow,
): Promise<{data: OpenProjectFileResponseData; response: string}> {
  let response = '';
  let data: OpenProjectFileResponseData;

  try {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      title: 'Select a project file *.awsp',
    });

    if (result.canceled) {
      response = 'Directory selection cancelled';
      data = {cancelled: true, project: undefined};
    } else {
      const filepath = result.filePaths[0];

      // Read workspace file as binary data
      const workspaceFileData = readFileSync(filepath);

      // Find .acdb file in the same directory
      const dirPath = dirname(filepath);
      let acdbFileData: Buffer | undefined;

      try {
        const files = await readdir(dirPath);
        const acdbFiles = files.filter((f) => f.endsWith('.acdb'));

        if (acdbFiles.length > 0) {
          // TODO: Handle multiple .acdb files - currently using the first one
          if (acdbFiles.length > 1) {
            console.warn(
              `Multiple .acdb files found in directory, using first: ${acdbFiles[0]}`,
            );
          }

          const acdbName = basename(acdbFiles[0]);
          const acdbFilePath = join(dirPath, acdbName);
          if (acdbFilePath.indexOf(dirPath) === 0) {
            acdbFileData = readFileSync(acdbFilePath);
          }
        }
      } catch (error) {
        console.error('Error reading .acdb file:', error);
      }

      response = `File selected: ${filepath}`;
      data = {
        acdbFileData,
        cancelled: false,
        project: getProjectFileInfo(filepath),
        workspaceFileData,
      };
      console.log(response);
    }
  } catch (error) {
    console.error('File selection error:', error);
    response = 'Failed to open file dialog';
    data = {cancelled: true, project: undefined};
  }

  return {data, response};
}

/** Used for testing open file from file system. Project files are treated as a
 * JSON, parsed into a javascript object and used for display in the UI */
function getProjectFileInfo(filepath: string): ArcWorkspaceFileProperties {
  const fileProps: ArcWorkspaceFileProperties = {
    description: '',
    filepath,
    name: '',
  };

  try {
    // Read the file content
    const fileContent = readFileSync(filepath, 'utf8');

    // Parse the JSON content
    const jsonData = JSON.parse(fileContent) as ArcWorkspaceFileProperties;

    // Extract name and description properties
    if (jsonData.name) {
      fileProps.name = jsonData.name;
    }

    if (jsonData.description) {
      fileProps.description = jsonData.description;
    }
  } catch (error) {
    console.error('Error reading project file:', error);
  }

  return fileProps;
}
/** Save validation results to a file using save dialog */
export async function saveValidationResults(
  win: Electron.BaseWindow,
  request: SaveValidationResultsRequest,
): Promise<{data: SaveValidationResultsResponseData; response: string}> {
  let response = '';
  let data: SaveValidationResultsResponseData;

  try {
    const currentDateTime = new Date()
      .toISOString()
      .replace(/[T:]/g, '-')
      .split('.')[0]; // YYYY-MM-DD-HH-MM-SS format
    const defaultFilename =
      request.defaultFilename || `validation_results_${currentDateTime}.txt`;

    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultFilename,
      filters: [
        {extensions: ['txt'], name: 'Text Files'},
        {extensions: ['*'], name: 'All Files'},
      ],
      title: 'Save Validation Results',
    });

    if (result.canceled) {
      response = 'Save dialog cancelled';
      data = {cancelled: true};
    } else {
      const filepath = result.filePath;

      // Write the validation results content to the selected file
      writeFileSync(filepath, request.content, 'utf8');

      response = `Validation results saved to: ${filepath}`;
      data = {
        cancelled: false,
        filepath,
      };
      console.log(response);
    }
  } catch (error) {
    console.error('File save error:', error);
    response = 'Failed to save validation results';
    data = {cancelled: true};
  }

  return {data, response};
}
/**
 * Write project files to disk.
 * Used for both Save and Save As — the caller provides the confirmed paths.
 */
export async function saveProjectFile(
  projectFiles: ProjectFile[],
): Promise<{data: SaveProjectFileResponseData; response: string}> {
  try {
    const workspaceFile = projectFiles.find((f) => f.filePath);
    if (!workspaceFile?.filePath) {
      return {
        data: {error: 'No workspace file path provided'},
        response: 'Missing workspace path',
      };
    }
    const baseDir = dirname(workspaceFile.filePath);
    for (const file of projectFiles) {
      let resolvedPath: string;
      if (file.filePath) {
        // Primary file path comes from the OS save dialog — trusted.
        resolvedPath = file.filePath;
      } else {
        // fileName is untrusted — strip path segments, then confirm the
        // resolved path stays inside baseDir.
        const safeName = basename(file.fileName);
        resolvedPath = join(baseDir, safeName);
        if (resolvedPath.indexOf(baseDir) !== 0) {
          return {
            data: {error: `Invalid file name: ${file.fileName}`},
            response: 'Rejected unsafe file path',
          };
        }
      }
      await writeFile(resolvedPath, Buffer.from(file.fileContent));
    }
    return {
      data: {},
      response: 'Project saved successfully',
    };
  } catch (error) {
    console.error('File write error:', error);
    return {
      data: {error: (error as Error).message},
      response: 'Failed to save file',
    };
  }
}

/** Show OS save dialog and return the chosen path — does NOT write any file */
export async function getSaveAsProjectFilePath(
  win: Electron.BaseWindow,
  defaultPath?: string,
): Promise<{data: GetSaveAsProjectFilePathResponseData; response: string}> {
  try {
    const result = await dialog.showSaveDialog(win, {
      defaultPath,
      filters: [
        {extensions: ['awsp'], name: 'AudioReach Workspace'},
        {extensions: ['*'], name: 'All Files'},
      ],
      title: 'Save Project As',
    });

    if (result.canceled || !result.filePath) {
      return {data: {cancelled: true}, response: 'Save dialog cancelled'};
    }

    const filePath = result.filePath.toLowerCase().endsWith('.awsp')
      ? result.filePath
      : `${result.filePath}.awsp`;

    return {
      data: {cancelled: false, filePath},
      response: `Path selected: ${filePath}`,
    };
  } catch (error) {
    console.error('Save dialog error:', error);
    return {
      data: {error: (error as Error).message},
      response: 'Failed to show save dialog',
    };
  }
}
// #endregion
