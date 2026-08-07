/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto, TagInfoDto} from '~entities/spf-module-data';

export type PortIOType = 'Input' | 'Output';
export type PortType = 'Static' | 'Dynamic';
export type ConnectionType =
  | 'MODULE_MODULE'
  | 'MODULE_SUBSYSTEM'
  | 'SUBSYSTEM_MODULE'
  | 'SUBSYSTEM_SUBSYSTEM';

export interface ChangeInfoDto {
  changeId?: string;
  changeStatus?: 'STAGED' | 'UNSTAGED';
  changeType: 'NONE' | 'CREATE' | 'UPDATE' | 'DELETE';
}

export interface EndPointLink {
  description: string;
  hypertextRef: string;
  method: string;
}

export interface DataPortDto {
  changeInfo: ChangeInfoDto;
  id: number;
  name: string;
  portIoType: PortIOType;
  portType: PortType;
  relatedEndPointLinks: EndPointLink[];
  systemId: string;
  totalLinksAtPort: number;
}

export interface ControlPortIntentDto {
  id: number;
  name: string;
}

export interface ControlPortDto {
  changeInfo: ChangeInfoDto;
  controlPortName: string;
  id: number;
  intents: ControlPortIntentDto[];
  name: string;
  portType: PortType;
  relatedEndPointLinks: EndPointLink[];
  systemId: string;
}

export interface SpfModuleDto {
  alias: string;
  changeInfo: ChangeInfoDto;
  ckvs?: CkvDto[];
  containerId: number;
  controlPorts: ControlPortDto[];
  dataPorts: DataPortDto[];
  heapId: number;
  id: number;
  maxControlPortsSupported: number;
  maxInputPortsSupported: number;
  maxOutputPortsSupported: number;
  moduleId: number;
  name: string;
  parentId?: number;
  relatedEndPointLinks: EndPointLink[];
  subgraphId: string;
  systemId: string;
  tags?: TagInfoDto[];
}

export class KeyInfo {
  readonly keyId!: number;
  readonly keyLabel!: string;
  readonly keySystemId!: string;

  constructor(keyId: number, keyLabel: string, keySystemId: string) {
    this.keyId = keyId;
    this.keyLabel = keyLabel;
    this.keySystemId = keySystemId;
  }

  equals(other: KeyInfo): boolean {
    if (!other) {
      return false;
    }
    return (
      this.keyId === other.keyId &&
      this.keyLabel === other.keyLabel &&
      this.keySystemId === other.keySystemId
    );
  }
}

export class ValueInfo {
  readonly valueId!: number;
  readonly valueLabel!: string;
  readonly valueSystemId!: string;

  constructor(valueId: number, valueLabel: string, valueSystemId: string) {
    this.valueId = valueId;
    this.valueLabel = valueLabel;
    this.valueSystemId = valueSystemId;
  }

  equals(other: ValueInfo): boolean {
    if (!other) {
      return false;
    }
    return (
      this.valueId === other.valueId &&
      this.valueLabel === other.valueLabel &&
      this.valueSystemId === other.valueSystemId
    );
  }
}

export interface SubsystemDto {
  changeInfo: ChangeInfoDto;
  controlPorts: ControlPortDto[];
  dataPorts: DataPortDto[];
  filteredKeys: KeyInfo[];
  id: number;
  name: string;
  parentId?: number;
  relatedEndPointLinks: EndPointLink[];
  systemId: string;
}

export interface DataLinkDto {
  changeInfo: ChangeInfoDto;
  connectionType: ConnectionType;
  destinationId: string;
  destinationPortId: string;
  isDangling: boolean;
  name: string;
  parentId?: number;
  relatedEndPointLinks: EndPointLink[];
  sourceId: string;
  sourcePortId: string;
  systemId: string;
}

export interface ControlLinkDto {
  changeInfo: ChangeInfoDto;
  connectionType: ConnectionType;
  destinationId: string;
  destinationPortId: string;
  isDangling: boolean;
  name: string;
  parentId?: number;
  relatedEndPointLinks: EndPointLink[];
  sourceId: string;
  sourcePortId: string;
  systemId: string;
}

export interface KeyValueInfo {
  keyInfo: KeyInfo;
  valueInfo: ValueInfo;
}

export interface ComponentCollectionDto {
  controlLinks: ControlLinkDto[];
  dataLinks: DataLinkDto[];
  spfModules: SpfModuleDto[];
  subsystems?: SubsystemDto[];
}
