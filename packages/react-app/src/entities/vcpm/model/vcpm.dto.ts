/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto, KeyValueInfo} from '~entities/spf-module-data';

export interface VcpmCkvDto {
  keyValuePairs: KeyValueInfo[];
  systemId: string;
}

export interface VcpmCkvListResponseDto {
  ckv: VcpmCkvDto[];
}

export interface CreateVcpmCkvsRequestDto {
  ckv: Array<{valueSystemIds: string[]}>;
}

export interface AddVcpmCkvsResponseDto {
  addedCkvs: VcpmCkvDto[];
  removedCkvSystemIds: string[];
}

export interface UpdateVcpmCalDataRequestDto {
  elements: AnyElementDto[];
  name: string;
  systemId: string;
}

export interface VcpmParameterCalDataDto {
  elements: AnyElementDto[];
  name: string;
  systemId: string;
}

// Added beyond design.md's literal API table — see plan Deviation 1.
export interface VcpmCalDataByCkvDto {
  ckvSystemId: string;
  parameters: VcpmParameterCalDataDto[];
}

export interface VcpmCalDataListResponseDto {
  calData: VcpmCalDataByCkvDto[];
}
