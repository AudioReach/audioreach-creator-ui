import type {ElectronApi, WindowWithApi} from "@audioreach-creator-ui/api-utils"

export const electronApi: ElectronApi | undefined = (
  typeof window === undefined ? undefined : (window as unknown as WindowWithApi)
)?.api
