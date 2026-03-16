import type {
  ConfigApi,
  KeyConfiguratorViewApi,
  LogViewApi,
  ModuleListApi,
  MruStoreApi,
  ProjectContextApi,
} from '@audioreach-creator-ui/api-utils';

declare global {
  interface Window {
    configApi: ConfigApi;
    keyConfiguratorViewApi: KeyConfiguratorViewApi;
    logViewApi: LogViewApi;
    moduleListApi: ModuleListApi;
    mruStoreApi: MruStoreApi;
    projectContextApi: ProjectContextApi;
  }
}
