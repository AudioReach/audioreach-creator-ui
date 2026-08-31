/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  PatchPropertiesRequestDto,
  PropertyDto,
} from '~shared/lib/property.dto';

export interface CreateSpfModuleRequestDto {
  containerSystemId?: string;
  moduleDefinitionSystemId: string;
  parentSystemId?: string;
  processorSystemId: string;
  subgraphSystemId?: string;
}

export interface PatchSpfModuleRequestDto {
  alias?: string;
  containerSystemId?: string;
  maxControlPortsSupported?: number;
  maxInputPortsSupported?: number;
  maxOutputPortsSupported?: number;
}

export interface DeletedComponentIdsDto {
  containers?: string[];
  controlLinks?: string[];
  dataLinks?: string[];
  spfModules?: string[];
  subgraphs?: string[];
}

export interface RemoveSpfModuleResponseDto {
  deleted: DeletedComponentIdsDto;
}

export type PatchSpfModulePropertiesRequestDto = PatchPropertiesRequestDto;

export type SpfModulePropertyDto = PropertyDto;
