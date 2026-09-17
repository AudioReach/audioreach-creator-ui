/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface ModuleInstanceTuningConfigDto {
  ckvs: CkvDto[];
  moduleInstanceSystemId: string;
  tags: TagInfoDto[];
}

export interface CkvDto {
  keyValuePairs: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface TkvDto {
  keyValuePairs: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface TagInfoDto {
  naturalId: number;
  systemId: string;
  tagName: string;
  tkvs: TkvDto[];
}

export interface ParamInfo {
  description: string;
  name: string;
  paramId: number;
  paramSystemId: string;
}

export interface KeyValueInfo {
  key: KeyInfo;
  value: ValueInfo;
}

export interface KeyInfo {
  name: string;
  naturalId: number;
  systemId: string;
}

export interface ValueInfo {
  name: string;
  naturalId: number;
  systemId: string;
}
