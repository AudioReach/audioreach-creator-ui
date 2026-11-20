/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ApiRequestType,
  ApiResponse,
  ConfigApi,
  ConfigResult,
  ConnectApi,
  ElectronApi,
  MruProjectInfo,
  MruStoreApi,
  ProjectContextApi,
  SaveFileApi,
} from '@audioreach-creator-ui/api-utils';
import {contextBridge, ipcRenderer} from 'electron';
import packageJson from '../package.json';

const api: ElectronApi = {
  send: (request: ApiRequestType): Promise<ApiResponse> => {
    return ipcRenderer.invoke('ipc::message', request);
  },
  versions: {
    appVersion: () => packageJson.version,
    chromeVersion: () => process.versions.chrome || '',
    electronVersion: () => process.versions.electron || '',
    nodeVersion: () => process.versions.node || '',
  },
};

contextBridge.exposeInMainWorld('api', api);

const configApi: ConfigApi = {
  loadConfigData: () =>
    ipcRenderer.invoke('load-config-data') as Promise<ConfigResult>,
  saveConfigData: (data: string) =>
    ipcRenderer.invoke('save-config-data', data) as Promise<ConfigResult>,
};

contextBridge.exposeInMainWorld('configApi', configApi);

const mruStoreApi: MruStoreApi = {
  addProject: (project: MruProjectInfo) =>
    ipcRenderer.invoke('mru:add-project', project) as Promise<boolean>,
  clearAll: () => ipcRenderer.invoke('mru:clear-all') as Promise<boolean>,
  getRecentProjects: () =>
    ipcRenderer.invoke('mru:get-recent-projects') as Promise<MruProjectInfo[]>,
  getStorePath: () =>
    ipcRenderer.invoke('mru:get-store-path') as Promise<string>,
  removeProject: (projectId: string) =>
    ipcRenderer.invoke('mru:remove-project', projectId) as Promise<boolean>,
  updateProjectImage: (projectId: string, image: string) =>
    ipcRenderer.invoke(
      'mru:update-project-image',
      projectId,
      image,
    ) as Promise<boolean>,
};

contextBridge.exposeInMainWorld('mruStoreApi', mruStoreApi);

// Project Context API
const projectContextApi: ProjectContextApi = {
  setProjectContext: (isActive: boolean) =>
    ipcRenderer.invoke('project-context:set', isActive),
};

contextBridge.exposeInMainWorld('projectContextApi', projectContextApi);

// Connect API — reports the registration handshake outcome back to main
const connectApi: ConnectApi = {
  reportRegistrationResult: (success: boolean) =>
    ipcRenderer.invoke('connect:registration-result', success) as Promise<void>,
};

contextBridge.exposeInMainWorld('connectApi', connectApi);

// Save File API
function createMenuListener(
  channel: string,
): (callback: () => void) => () => void {
  return (callback) => {
    const listener = () => callback();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

const saveFileApi: SaveFileApi = {
  onSaveAll: createMenuListener('menu:save-all'),
  onSaveProject: createMenuListener('menu:save-project'),
  onSaveProjectAs: createMenuListener('menu:save-project-as'),
};

contextBridge.exposeInMainWorld('saveFileApi', saveFileApi);
