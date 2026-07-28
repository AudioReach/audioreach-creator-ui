import type {
  ConfigApi,
  ConnectApi,
  KeyConfiguratorViewApi,
  LogViewApi,
  ModuleListApi,
  MruStoreApi,
  ProjectContextApi,
  SaveFileApi,
} from '@audioreach-creator-ui/api-utils';

declare global {
  interface Window {
    configApi: ConfigApi;
    connectApi?: ConnectApi;
    keyConfiguratorViewApi: KeyConfiguratorViewApi;
    logViewApi: LogViewApi;
    moduleListApi: ModuleListApi;
    mruStoreApi: MruStoreApi;
    projectContextApi: ProjectContextApi;
    saveFileApi: SaveFileApi;
  }
}
