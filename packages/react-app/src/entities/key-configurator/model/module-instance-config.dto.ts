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
  keyValueCollection: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface TkvDto {
  keyValueCollection: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface TagInfoDto {
  systemId: string;
  tagId: number;
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
  keyInfo: KeyInfo;
  valueInfo: ValueInfo;
}

export interface KeyInfo {
  keyId: number;
  keyLabel: string;
  keySystemId: string;
}

export interface ValueInfo {
  valueId: number;
  valueLabel: string;
  valueSystemId: string;
}
