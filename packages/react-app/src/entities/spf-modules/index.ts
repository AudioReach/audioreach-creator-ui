/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export {
  createSpfModule,
  deleteSpfModule,
  fetchSpfModuleProperties,
  patchSpfModule,
  patchSpfModuleProperties,
} from './api/spf-modules-api';
export type {
  CreateSpfModuleRequestDto,
  DeletedComponentIdsDto,
  PatchSpfModulePropertiesRequestDto,
  PatchSpfModuleRequestDto,
  RemoveSpfModuleResponseDto,
  SpfModulePropertyDto,
} from './model/spf-module-crud.dto';
