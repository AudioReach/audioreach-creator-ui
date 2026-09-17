/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto, TagInfoDto} from '~entities/spf-module-data';
import type {RelatedEndPointLink} from '~entities/usecases';
import type {
  PropertyCollectionRequestDto,
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
  containers: DeletedIdDto[];
  controlLinks: DeletedLinkDto[];
  dataLinks: DeletedLinkDto[];
  spfModules: DeletedIdDto[];
  subgraphs: DeletedIdDto[];
  unresolvedSubsystemControlLinks?: DeletedIdDto[];
  unresolvedSubsystemDataLinks?: DeletedIdDto[];
}

export interface DeletedIdDto {
  systemId: string;
}

export interface DeletedLinkDto {
  subsystemLinks?: DeletedIdDto[];
  systemId: string;
}

export interface UpdatedContainerDto {
  stackSize: number;
  systemId: string;
}

export interface UpdatedSpfModuleCollectionDto {
  containers: UpdatedContainerDto[];
  subsystems?: UpdatedSubsystemDto[];
  usecases: DeletedIdDto[];
}

export interface UpdatedSubsystemDto {
  intentsClearedControlPorts: DeletedIdDto[];
  systemId: string;
}

export interface RemoveSpfModuleResponseDto {
  deleted: DeletedComponentIdsDto;
  updated: UpdatedSpfModuleCollectionDto;
}

export interface SpfModuleResponseDto {
  alias?: string;
  ckvs?: CkvDto[];
  containerSystemId: string;
  controlPorts: unknown[];
  dataPorts: unknown[];
  maxControlPortsSupported: number;
  maxInputPortsSupported: number;
  maxOutputPortsSupported: number;
  moduleDefinitionSystemId: string;
  name: string;
  naturalId: number;
  parentSystemId?: string;
  properties?: PropertyDto[];
  relatedEndPointLinks: RelatedEndPointLink[];
  subgraphSystemId: string;
  systemId: string;
  tags?: TagInfoDto[];
}

export type PatchSpfModulePropertiesRequestDto = PropertyCollectionRequestDto;

export type SpfModulePropertyDto = PropertyDto;
