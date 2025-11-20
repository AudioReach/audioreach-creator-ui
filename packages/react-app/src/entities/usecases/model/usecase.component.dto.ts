export type PortIOType = "Input" | "Output"
export type PortType = "Static" | "Dynamic"
export type ConnectionType =
  | "MODULE_MODULE"
  | "MODULE_SUBSYSTEM"
  | "SUBSYSTEM_MODULE"
  | "SUBSYSTEM_SUBSYSTEM"

export interface EndPointLink {
  _description: string
  _hypertextRef: string
  _method: string
}

export interface DataPortDto {
  _id: number
  _name: string
  _portIoType: PortIOType
  _portType: PortType
  _relatedEndPointLinks: EndPointLink[]
  _systemId: string
}

export interface ControlPortIntentDto {
  id: number
  name: string
}

export interface ControlPortDto {
  controlPortName: string
  id: number
  intents: ControlPortIntentDto[]
  portType: PortType
  relatedEndPointLinks: EndPointLink[]
  systemId: string
}

export interface ModuleInstanceDto {
  _controlPorts: ControlPortDto[]
  _dataPorts: DataPortDto[]
  _id: number
  _name: string
  _relatedEndPointLinks: EndPointLink[]
  _systemId: string
  alias: string
  containerId: number
  heapId: number
  maxControlPortsSupported: number
  maxInputPortsSupported: number
  maxOutputPortsSupported: number
  moduleId: number
  parentId?: number // optional: subsystem
  subgraphId: number
}

export interface KeyInfo {
  keyId: number
  keyLabel: string
}

export interface SubsystemDto {
  controlPorts: ControlPortDto[]
  dataPorts: DataPortDto[]
  filteredKeys: KeyInfo[]
  id: number
  name: string
  parentId?: number
  relatedEndPointLinks: EndPointLink[]
  systemId: string
}

export interface DataLinkDto {
  _name: string
  _relatedEndPointLinks: EndPointLink[]
  _systemId: string
  connectionType: ConnectionType
  destinationId: number
  destinationPortId: number
  isDangling: boolean
  parentId?: number
  sourceId: number
  sourcePortId: number
}

export interface ControlLinkDto {
  connectionType: ConnectionType
  destinationId: number
  destinationPortId: number
  isDangling: boolean
  name: string
  parentId?: number
  relatedEndPointLinks: EndPointLink[]
  sourceId: number
  sourcePortId: number
  systemId: string
}

export interface UsecaseComponentsDto {
  controlLinks: ControlLinkDto[]
  dataLinks: DataLinkDto[]
  moduleInstances: ModuleInstanceDto[]
  subsystems: SubsystemDto[]
}
