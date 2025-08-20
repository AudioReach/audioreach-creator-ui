import type {Connection} from "~entities/examples/connection"

import type {ModuleInstance} from "./module-instance"

export interface Graph {
  connections: Connection[]
  description?: string
  id: string
  metadata?: Record<string, unknown>
  moduleInstances: ModuleInstance[]
  name: string
}
