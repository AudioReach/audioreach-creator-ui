/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type ToolPolicy = 'CALIBRATION' | 'RTC' | 'RTC_READONLY' | 'RTM';

export type AnyElementDto =
  | ConfigElementDto
  | ElementTemplateArrayDto
  | StructDto;

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

export interface BitFieldDto {
  allowedValues: NameValuePairDto[];
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
  allowedValues?: (BitFieldDto | NameValuePairDto)[];
  description?: string;
  displayType?: DisplayType;
  group?: string;
  isReadOnly: boolean;
  linkedElementNames?: string[];
  max?: number;
  min?: number;
  name: string;
  policy?: 'ADVANCED' | 'BASIC' | 'HIDDEN';
  precision?: number;
  qFormat?: string;
  subgroup?: string;
  type: 'CONFIG_ELEMENT';
  unit?: string;
  value: string;
}

export interface ElementTemplateArrayDto {
  description?: string;
  group?: string;
  isReadOnly: boolean;
  length?: number;
  lengthFormula?: string;
  name: string;
  subgroup?: string;
  template: AnyElementDto[];
  type: 'ELEMENT_TEMPLATE_ARRAY';
  value: AnyElementDto[];
}

export interface KeyInfo {
  keyId: number;
  keyLabel: string;
  keySystemId: string;
}

export interface KeyValueDto {
  key: {keyId: number; name: string; systemId: string};
  value: {name: string; systemId: string; valueId: number};
}

export interface KeyValueInfo {
  keyInfo: KeyInfo;
  valueInfo: ValueInfo;
}

export interface NameValuePairDto {
  name: string;
  type: 'NAME_VALUE_PAIR';
  value: string;
}

export interface ParamInfo {
  description: string;
  name: string;
  paramId: number;
  paramSystemId: string;
}

export interface ParameterDetailDto {
  changeInfo: ChangeInfoDto;
  deprecated?: boolean;
  description?: string;
  elements: AnyElementDto[];
  isHidden?: boolean;
  isNeuralNet?: boolean;
  isOffloaded?: boolean;
  isReadOnly?: boolean;
  name: string;
  parameterId: string;
  systemId: string;
  toolPolicy?: ToolPolicy[];
}

export interface StructDto {
  description?: string;
  group?: string;
  isReadOnly: boolean;
  name: string;
  structType: string;
  subgroup?: string;
  type: 'STRUCT';
  value: AnyElementDto[];
}

export interface ValueInfo {
  valueId: number;
  valueLabel: string;
  valueSystemId: string;
}
