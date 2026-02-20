/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface SpfModuleDefinitionResponseDto {
  builtIn: boolean;
  customModuleInfo: CustomModuleInfo;
  deprecated: boolean;
  description: string;
  displayName: string;
  isOffloadable: boolean;
  modSearchKeys: string;
  moduleDirectionType: string;
  moduleId: number;
  moduleInfo: ModuleInfo;
  name: string;
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
  processorInfo: ProcessorInfo;
  systemId: string;
  vocoderModuleType: string;
}

export interface ParamDefinitionsSummaryInfo {
  deprecated: boolean;
  description: string;
  isHidden: boolean;
  isReadOnly: boolean;
  name: string;
  paramId: number;
  pidType: string;
  systemId: string;
  toolPolicy: string;
}

export interface ProcessorInfo {
  name: string;
  processorId: number;
  systemId: string;
}

export interface ModuleInfo {
  containerTypeInfo: ContainerTypeInfo[];
  dynamicIntents: IntentInfo[];
  inputDataPortInfo: DataPortInfo;
  mdfModuleType: string;
  metaData: number;
  moduleTypeInfo: ModuleTypeInfo;
  outputDataPortInfo: DataPortInfo;
  pidFramework: number;
  reserved: number;
  stackSize: number;
  staticCtrlPorts: StaticCtrlPortInfo;
}

export interface CustomModuleInfo {
  entryPointTag: string;
  fileName: string;
  interfaceTypeId: number;
  interfaceVersionId: number;
  majorTypeId: number;
}

export interface ContainerTypeInfo {
  name: string;
  value: string;
}

export interface DataPortInfo {
  maxPorts: number;
  ports: PortInfo[];
  systemId: string;
}

export interface PortInfo {
  portId: number;
  portName: string;
}

export interface IntentInfo {
  intentId: number;
  maxPorts: number;
  name: string;
  systemId: string;
}

export interface StaticCtrlPortInfo {
  portId: number;
  portIntents: IntentInfo[];
  portName: string;
  systemId: string;
}

export interface ModuleTypeInfo {
  buildType: string;
  islandFriendly: boolean;
  majorModuleType: string;
}
