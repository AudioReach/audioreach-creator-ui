import type {Parameter} from "./parameter"
import type {Port} from "./port"

export interface Module {
  description: string
  displayName: string
  id: string
  inputPorts: Port[]
  isBuiltin: boolean
  name: string
  outputPorts: Port[]
  parameters: Parameter[]
}
