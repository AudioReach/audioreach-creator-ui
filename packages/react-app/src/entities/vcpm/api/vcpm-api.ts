/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {httpClient, type ApiResult} from '~shared/api';

import type {
  AddVcpmCkvsResponseDto,
  CreateVcpmCkvsRequestDto,
  UpdateVcpmCalDataRequestDto,
  VcpmCalDataDto,
  VcpmCkvListResponseDto,
  VcpmParameterCalDataDto,
} from '../model/vcpm.dto';

function vcpmCkvResourcePath(projectId: string, subgraphId: string): string {
  return `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv`;
}

export async function getVcpmCkvs(
  projectId: string,
  subgraphId: string,
): Promise<ApiResult<VcpmCkvListResponseDto>> {
  return httpClient.get(vcpmCkvResourcePath(projectId, subgraphId));
}

export async function createVcpmCkvs(
  projectId: string,
  subgraphId: string,
  body: CreateVcpmCkvsRequestDto,
): Promise<ApiResult<AddVcpmCkvsResponseDto>> {
  return httpClient.post(vcpmCkvResourcePath(projectId, subgraphId), body);
}

export async function deleteVcpmCkv(
  projectId: string,
  subgraphId: string,
  ckvSystemId: string,
): Promise<ApiResult<void>> {
  return httpClient.delete(
    `${vcpmCkvResourcePath(projectId, subgraphId)}/${ckvSystemId}`,
  );
}

export async function getVcpmCalData(
  projectId: string,
  subgraphId: string,
  ckvSystemId: string,
): Promise<ApiResult<VcpmCalDataDto>> {
  return httpClient.get(
    `${vcpmCkvResourcePath(projectId, subgraphId)}/${ckvSystemId}/cal-data`,
  );
}

export async function updateVcpmCalData(
  projectId: string,
  subgraphId: string,
  ckvSystemId: string,
  body: UpdateVcpmCalDataRequestDto,
): Promise<ApiResult<VcpmParameterCalDataDto>> {
  return httpClient.put(
    `${vcpmCkvResourcePath(projectId, subgraphId)}/${ckvSystemId}/cal-data`,
    body,
    {retries: 0},
  );
}
