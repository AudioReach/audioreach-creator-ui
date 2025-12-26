import type {ConfigApi, MruStoreApi} from "@audioreach-creator-ui/api-utils"

declare global {
  interface Window {
    configApi: ConfigApi
    mruStoreApi: MruStoreApi
  }
}
