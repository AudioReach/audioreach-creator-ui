/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type ToolPolicy = 'CALIBRATION' | 'RTC' | 'RTC_READONLY' | 'RTM';

export type AnyElementDto =
  ConfigElementDto | ElementTemplateArrayDto | StructDto;

export type DisplayType =
  | 'BIT_FIELD'
  | 'CHECK_BOX'
  | 'DB_TEXT_BOX'
  | 'DROP_DOWN'
  | 'DUMP'
  | 'FILE'
  | 'FORMULA'
  | 'Q_FORMATTED_VALUE'
  | 'SLIDER'
  | 'STRING_FIELD'
  | 'TEXT_BOX';

export type ConfigElementDataType =
  | 'Double'
  | 'Float'
  | 'Int8'
  | 'Int16'
  | 'Int32'
  | 'Int64'
  | 'RawData'
  | 'UInt8'
  | 'UInt16'
  | 'UInt32'
  | 'UInt64';

export interface BitFieldDto {
  allowedValues: NameValueDto[];
  bitMask: string;
  description?: string;
  name: string;
  type: 'BIT_FIELD';
}

export interface ChangeInfoDto {
  changeId?: string;
  changeStatus?: 'STAGED' | 'UNSTAGED';
  changeType: 'CREATE' | 'DELETE' | 'NONE' | 'UPDATE';
}

export interface ConfigElementDto {
  allowedValues?: (BitFieldDto | NameValueDto)[];
  dataType: ConfigElementDataType;
  description?: string;
  displayType?: string;
  group?: string;
  isReadOnly: boolean;
  linkedElementNames?: string[];
  max?: number;
  min?: number;
  name?: string;
  policy?: string;
  precision?: number;
  qFormat?: string;
  subgroup?: string;
  type: 'ConfigElement';
  unit?: string;
  value: string;
}

export interface ElementTemplateArrayDto {
  description?: string;
  group?: string;
  isReadOnly: boolean;
  length?: number;
  lengthFormula?: string;
  name?: string;
  subgroup?: string;
  template: AnyElementDto[];
  type: 'ElementTemplateArray';
  value: AnyElementDto[];
}

export interface KeyInfo {
  name: string;
  naturalId: number;
  systemId: string;
}

export interface KeyValueDto {
  key: KeyInfo;
  value: ValueInfo;
}

export interface KeyValueInfo {
  key: KeyInfo;
  value: ValueInfo;
}

export interface NameValueDto {
  name: string;
  value: string;
  valueDataType: ConfigElementDataType;
}

export interface ParamInfo {
  description: string;
  name: string;
  naturalId: number;
  systemId: string;
}

export interface ParameterDetailDto {
  deprecated?: boolean;
  description?: string;
  elements: AnyElementDto[];
  isHidden?: boolean;
  isNeuralNet?: boolean;
  isOffloaded?: boolean;
  isReadOnly?: boolean;
  name: string;
  naturalId: string;
  pidType?: string;
  systemId: string;
}

export interface StructDto {
  description?: string;
  group?: string;
  isReadOnly: boolean;
  name?: string;
  structType: string;
  subgroup?: string;
  type: 'Struct';
  value: AnyElementDto[];
}

export interface ValueInfo {
  name: string;
  naturalId: number;
  systemId: string;
}
