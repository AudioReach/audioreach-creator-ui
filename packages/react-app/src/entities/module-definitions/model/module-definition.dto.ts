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
  naturalId: number;
  pidType: string;
  systemId: string;
  toolPolicy: string;
}

export interface ProcessorInfo {
  name: string;
  naturalId: number;
  systemId: string;
}

export interface ModuleInfo {
  containerTypeInfo: ContainerTypeInfo[];
  dynamicIntents: IntentInfo[];
  inputDataPortInfo: DataPortInfo;
  outputDataPortInfo: DataPortInfo;
  pidFramework: number;
  stackSize?: number;
  staticCtrlPorts: StaticCtrlPortInfo[];
}

export interface CustomModuleInfo {
  endPointFunctionTag: string;
  fileName: string;
  interface: {
    type: NameValueDto;
    version: NameValueDto;
  };
  type: NameValueDto;
}

export interface DataTypeDto {
  maxValue?: string;
  minValue?: string;
  sizeInBytes: number;
  typeName: string;
}

export interface NameValueDto {
  name: string;
  value: string;
  valueDataType: DataTypeDto;
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
