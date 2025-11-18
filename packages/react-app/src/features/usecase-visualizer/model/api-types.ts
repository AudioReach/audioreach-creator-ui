// API-aligned DTOs from swagger schema
// UseCaseVisualizer feature - model layer

export type PortIOType = "Input" | "Output"
export type PortType = "Static" | "Dynamic"
export type ComponentType =
  | "Module"
  | "Subsystem"
  | "Container"
  | "DataLink"
  | "ControlLink"
  | "Subgraph"
  | "DataPort"
  | "ControlPort"
  | "SubgraphProxy"
  | "BusPortStrip"

export interface EndPointLink {
  description: string
  hypertextRef: string
  method: string
}

export interface DataPortDto {
  componentType: "DataPort"
  dataPortName: string
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
  componentType: "ControlPort"
  controlPortName: string
  id: number
  intents: ControlPortIntentDto[]
  name: string
  portType: PortType
  relatedEndPointLinks: EndPointLink[]
  systemId: string
}

export interface ModuleInstanceDto {
  alias: string
  componentType: "Module"
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
  parentId?: number // optional: subsystem id
  relatedEndPointLinks: EndPointLink[]
  subgraphId: number
  systemId: string
}

export interface KeyInfo {
  keyId: number
  keyLabel: string
}

export interface SubsystemDto {
  _filteredKeys: KeyInfo[]
  componentType: "Subsystem"
  controlPorts: ControlPortDto[]
  dataPorts: DataPortDto[]
  id: number
  name: string
  parentId?: number
  relatedEndPointLinks: EndPointLink[]
  systemId: string
}

export type ConnectionType =
  | "MODULE_MODULE"
  | "MODULE_SUBSYSTEM"
  | "SUBSYSTEM_MODULE"
  | "SUBSYSTEM_SUBSYSTEM"
  | "SUBGRAPHPROXY_MODULE"
  | "SUBGRAPHPROXY_SUBSYSTEM"
  | "MODULE_SUBGRAPHPROXY"
  | "SUBSYSTEM_SUBGRAPHPROXY"
  | "SUBGRAPHPROXY_SUBGRAPHPROXY"

export interface DataLinkDto {
  componentType: "DataLink"
  connectionType: ConnectionType
  destinationId: number
  destinationPortId: number
  id: number
  isDangling: boolean
  name: string
  parentId?: number
  relatedEndPointLinks: EndPointLink[]
  sourceId: number
  sourcePortId: number
  systemId: string
}

export interface ControlLinkDto {
  componentType: "ControlLink"
  connectionType: ConnectionType
  destinationId: number
  destinationPortId: number
  id: number
  isDangling: boolean
  name: string
  parentId?: number
  relatedEndPointLinks: EndPointLink[]
  sourceId: number
  sourcePortId: number
  systemId: string
}

export interface UsecaseIdentifier {
  keyValueCollection: unknown[]
  relatedEndPointLinks: EndPointLink[]
  systemId: string
  usecaseAliasId?: number
  usecaseAliasName?: string
  usecaseCategory?: string
  usecaseType: "SubsystemFiltered" | "Ec" | "Regular" | "Manual"
}

export interface UsecaseComponentsDto {
  controlLinks: ControlLinkDto[]
  dataLinks: DataLinkDto[]
  moduleInstances: ModuleInstanceDto[]
  subsystems: SubsystemDto[]
  usecaseIdentifier: UsecaseIdentifier
}
