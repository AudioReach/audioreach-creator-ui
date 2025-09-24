import type {ConfigApi} from "@audioreach-creator-ui/api-utils"

declare global {
  interface Window {
    configApi: ConfigApi
  }
}
