/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

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

export class KeyInfo {
  readonly keyId!: number
  readonly keyLabel!: string
  readonly keySystemId!: string

  constructor(keyId: number, keyLabel: string, keySystemId: string) {
    this.keyId = keyId
    this.keyLabel = keyLabel
    this.keySystemId = keySystemId
  }

  equals(other: KeyInfo): boolean {
    if (!other) {
      return false
    }
    return (
      this.keyId === other.keyId &&
      this.keyLabel === other.keyLabel &&
      this.keySystemId === other.keySystemId
    )
  }
}

export class ValueInfo {
  readonly valueId!: number
  readonly valueLabel!: string
  readonly valueSystemId!: string

  constructor(valueId: number, valueLabel: string, valueSystemId: string) {
    this.valueId = valueId
    this.valueLabel = valueLabel
    this.valueSystemId = valueSystemId
  }

  equals(other: ValueInfo): boolean {
    if (!other) {
      return false
    }
    return (
      this.valueId === other.valueId &&
      this.valueLabel === other.valueLabel &&
      this.valueSystemId === other.valueSystemId
    )
  }
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
