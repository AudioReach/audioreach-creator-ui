/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface KeyDefinitionResponseDto {
  calKeyEnumMember?: string;
  description?: string;
  enumMember: string;
  enumName: string;
  graphKeyEnumMember: string;
  isCalibrationKey: boolean;
  isDynamic: boolean;
  isGraphKey: boolean;
  isVoice: boolean;
  name: string;
  naturalId: number;
  specialKey?: 'SAMPLE_RATE' | 'VOLUME';
  systemId: string;
  values: ValueDefinitionDto[];
}

export interface ValueDefinitionDto {
  description?: string;
  enumMember: string;
  name: string;
  naturalId: number;
  specialValue?: string;
  systemId: string;
}

export interface TagDefinitionResponseDto {
  enumMember?: string;
  enumName?: string;
  keyDefinitions?: TagKeyDefinitionInfo[];
  name: string;
  naturalId: number;
  systemId: string;
}

export interface TagKeyDefinitionInfo {
  cHeaderEnumValue: string;
  description?: string;
  name: string;
  naturalId: number;
  systemId: string;
  values: TagValueDefinitionInfo[];
}

export interface TagValueDefinitionInfo {
  description?: string;
  name: string;
  naturalId: number;
  systemId: string;
}
