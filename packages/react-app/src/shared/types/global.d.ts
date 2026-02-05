import type {
  ConfigApi,
  LogViewApi,
  MruStoreApi,
  ProjectContextApi,
} from "@audioreach-creator-ui/api-utils"

declare global {
  interface Window {
    configApi: ConfigApi
    logViewApi: LogViewApi
    mruStoreApi: MruStoreApi
    projectContextApi: ProjectContextApi
  }
}
