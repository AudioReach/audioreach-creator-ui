/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export {
  createSpfModule,
  deleteSpfModule,
  patchSpfModule,
} from './api/spf-modules-api';
export type {
  CreateSpfModuleRequestDto,
  DeletedComponentIdsDto,
  PatchSpfModuleRequestDto,
  RemoveSpfModuleResponseDto,
} from './model/spf-module-crud.dto';
