/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface SpfModuleDefinitionResponseDto {
  builtIn: boolean;
  customModuleData?: CustomModuleInfo;
  deprecated?: boolean;
  description: string;
  displayName: string;
  isCustomModule: boolean;
  isLoadedAtBootup: boolean;
  isOffloadable?: boolean;
  modSearchKeys: string;
  moduleDirectionType?: string;
  moduleInfo: ModuleInfo;
  name: string;
  naturalId: number;
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
  processorInfo: ProcessorInfo;
  systemId: string;
  vocoderModuleType?: string;
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
  naturalId: number;
  portName: string;
}

export interface IntentInfo {
  maxPorts: number;
  name: string;
  naturalId: number;
  systemId: string;
}

export interface StaticCtrlPortInfo {
  naturalId: number;
  portIntents: IntentInfo[];
  portName: string;
  systemId: string;
}

export interface ModuleTypeInfo {
  buildType: string;
  islandFriendly: boolean;
  majorModuleType: string;
}
