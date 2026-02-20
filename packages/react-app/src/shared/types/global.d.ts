import type {
  ConfigApi,
  KeyConfiguratorViewApi,
  LogViewApi,
  MruStoreApi,
  ProjectContextApi,
} from '@audioreach-creator-ui/api-utils';

declare global {
  interface Window {
    configApi: ConfigApi;
    keyConfiguratorViewApi: KeyConfiguratorViewApi;
    logViewApi: LogViewApi;
    mruStoreApi: MruStoreApi;
    projectContextApi: ProjectContextApi;
  }
}
