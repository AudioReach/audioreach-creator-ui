import type {
  ConfigApi,
  KeyConfiguratorViewApi,
  LogViewApi,
  MruStoreApi,
  ProjectContextApi,
} from '@audioreach-creator-ui/api-utils';

declare global {
  // eslint-disable-next-line no-var
  var configApi: ConfigApi;
  // eslint-disable-next-line no-var
  var keyConfiguratorViewApi: KeyConfiguratorViewApi;
  // eslint-disable-next-line no-var
  var logViewApi: LogViewApi;
  // eslint-disable-next-line no-var
  var mruStoreApi: MruStoreApi;
  // eslint-disable-next-line no-var
  var projectContextApi: ProjectContextApi;
}
