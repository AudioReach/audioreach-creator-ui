/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface KeyDefinitionResponseDto {
  cHeaderCalibrationKeyEnumValue: string;
  cHeaderEnumName: string;
  cHeaderEnumValue: string;
  cHeaderGraphKeyEnumValue: string;
  description: string;
  isCalibrationKey: boolean;
  isDynamic: boolean;
  isGraphKey: boolean;
  isVoice: boolean;
  keyId: number;
  name: string;
  specialKey: string;
  systemId: string;
  values: ValueDefinitionDto[];
}

export interface ValueDefinitionDto {
  cHeaderEnumValue: string;
  description: string;
  name: string;
  specialValue: string;
  systemId: string;
  valueId: number;
}

export interface TagDefinitionResponseDto {
  cHeaderEnumName: string;
  cHeaderEnumValue: string;
  keyDefinitions: TagKeyDefinitionInfo[];
  name: string;
  systemId: string;
  tagId: number;
}

export interface TagKeyDefinitionInfo {
  cHeaderEnumValue: string;
  description: string;
  keyId: number;
  name: string;
  systemId: string;
  values: TagValueDefinitionInfo[];
}

export interface TagValueDefinitionInfo {
  description: string;
  name: string;
  systemId: string;
  valueId: number;
}
