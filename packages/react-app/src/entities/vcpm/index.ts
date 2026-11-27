/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export {
  createVcpmCkvs,
  deleteVcpmCkv,
  getVcpmCalData,
  getVcpmCkvs,
  updateVcpmCalData,
} from './api/vcpm-api';
export {
  transformVcpmCkvsToConfiguredCkvs,
  transformVcpmConfiguredParamsToConfiguredCkvs,
} from './lib/vcpm.transform';
export type {
  AddVcpmCkvsResponseDto,
  CreateVcpmCkvsRequestDto,
  UpdateVcpmCalDataRequestDto,
  VcpmAssociatedCkvDto,
  VcpmCalDataDto,
  VcpmCkvDto,
  VcpmCkvListResponseDto,
  VcpmConfiguredParamDto,
  VcpmParameterCalDataDto,
} from './model/vcpm.dto';
