export type PortIOType = "Input" | "Output"
export type PortType = "Static" | "Dynamic"
export type ConnectionType =
  | "MODULE_MODULE"
  | "MODULE_SUBSYSTEM"
  | "SUBSYSTEM_MODULE"
  | "SUBSYSTEM_SUBSYSTEM"

export interface EndPointLink {
  description: string
  hypertextRef: string
  method: string
}

export interface DataPortDto {
  id: number
  name: string
  portIoType: PortIOType
  portType: PortType
  relatedEndPointLinks: EndPointLink[]
  systemId: string
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
  alias: string
  containerId: number
  controlPorts: ControlPortDto[]
  dataPorts: DataPortDto[]
  heapId: number
  id: number
  maxControlPortsSupported: number
  maxInputPortsSupported: number
  maxOutputPortsSupported: number
  moduleId: number
  name: string
  parentId?: number // optional: subsystem
  relatedEndPointLinks: EndPointLink[]
  subgraphId: number
  systemId: string
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
