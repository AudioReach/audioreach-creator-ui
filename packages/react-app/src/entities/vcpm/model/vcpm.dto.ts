/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto, KeyValueInfo} from '~entities/spf-module-data';

export interface VcpmCkvDto {
  keyValuePairs: KeyValueInfo[];
  systemId: string;
}

export interface VcpmAssociatedCkvDto {
  ckv: KeyValueInfo[];
  ckvSystemId: string;
}

// Verified against the real backend: this GET is keyed by parameter, not
// by CKV — each configured parameter lists the CKVs it's associated with,
// and the same ckvSystemId can repeat across multiple parameters.
export interface VcpmConfiguredParamDto {
  associatedCkvs: VcpmAssociatedCkvDto[];
  paramName: string;
  paramSystemId: string;
}

export interface VcpmCkvListResponseDto {
  configuredParams: VcpmConfiguredParamDto[];
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
// Verified against the real backend: this GET returns cal data for one
// CKV at a time, not a bulk list across every CKV in the subgraph.
export interface VcpmCalDataDto {
  Ckv: KeyValueInfo[];
  parameters: VcpmParameterCalDataDto[];
  systemId: string;
}
