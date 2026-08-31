/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto} from '~entities/spf-module-data';

export type PropertyElement = AnyElementDto;

export interface PropertyDto {
  elements: PropertyElement[];
  hasDefinition: boolean;
  propertyId: number;
  propertyName: string;
  systemId: string;
}

export interface PropertiesResponseDto {
  properties: PropertyDto[];
}

export interface PatchPropertiesRequestDto {
  properties: PropertyDto[];
}
