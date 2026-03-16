/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ApiRequestType,
  ApiResponse,
  ConfigApi,
  ConfigResult,
  ElectronApi,
  KeyConfiguratorViewApi,
  LogViewApi,
  ModuleListApi,
  MruProjectInfo,
  MruStoreApi,
  ProjectContextApi,
} from '@audioreach-creator-ui/api-utils';
import {contextBridge, ipcRenderer} from 'electron';

const api: ElectronApi = {
  send: (request: ApiRequestType): Promise<ApiResponse> => {
    return ipcRenderer.invoke('ipc::message', request);
  },
  versions: {
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

// Key Configurator View API
const keyConfiguratorViewApi: KeyConfiguratorViewApi = {
  onToggleKeyConfiguratorView: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-key-configurator-view', callback);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('menu:toggle-key-configurator-view', callback);
    };
  },
  updateKeyConfiguratorViewState: (isOpen: boolean) =>
    ipcRenderer.invoke('key-configurator-view:update-state', isOpen),
};

contextBridge.exposeInMainWorld(
  'keyConfiguratorViewApi',
  keyConfiguratorViewApi,
);

// Log View API
const logViewApi: LogViewApi = {
  onToggleLogView: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-log-view', callback);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('menu:toggle-log-view', callback);
    };
  },
  updateLogViewState: (isOpen: boolean) =>
    ipcRenderer.invoke('log-view:update-state', isOpen),
};

contextBridge.exposeInMainWorld('logViewApi', logViewApi);

// Module List API
const moduleListApi: ModuleListApi = {
  onToggleModuleList: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-module-list', callback);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('menu:toggle-module-list', callback);
    };
  },
  updateModuleListState: (isOpen: boolean) =>
    ipcRenderer.invoke('module-list:update-state', isOpen),
};

contextBridge.exposeInMainWorld('moduleListApi', moduleListApi);

// Project Context API
const projectContextApi: ProjectContextApi = {
  setProjectContext: (isActive: boolean) =>
    ipcRenderer.invoke('project-context:set', isActive),
};

contextBridge.exposeInMainWorld('projectContextApi', projectContextApi);
