import type {Port} from "./port"

// Module ports - port configuration data
export interface ModulePorts {
  inputPorts: Port[]
  moduleId: string
  outputPorts: Port[]
}
