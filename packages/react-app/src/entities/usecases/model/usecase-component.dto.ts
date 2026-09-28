/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import type {CkvDto, TagInfoDto} from '~entities/spf-module-data';
import type {ApiResult} from '~shared/api';

import type {UsecaseDto} from './usecase.dto';

export type PortIOType = 'Input' | 'Output';
export type PortType = 'Static' | 'Dynamic';
export type ConnectionType =
  | 'MODULE_MODULE'
  | 'MODULE_SUBSYSTEM'
  | 'SUBSYSTEM_MODULE'
  | 'SUBSYSTEM_SUBSYSTEM';
export type LinkType = 'EC' | 'INTER_USECASE' | 'NORMAL';
export type ControlLinkType = Exclude<LinkType, 'EC'>;

export function isInterUsecaseLink(linkType: LinkType): boolean {
  return linkType === 'INTER_USECASE';
}

export function toControlLinkType(linkType: LinkType): ControlLinkType {
  if (linkType === 'EC') {
    throw new Error('EC link type is only valid for data links');
  }
  return linkType;
}

export interface EndPointLink {
  description: string;
  hypertextRef: string;
  method: string;
}

export interface DataPortDto {
  name: string;
  naturalId: number;
  portIoType: PortIOType;
  portType: PortType;
  systemId: string;
  totalLinksAtPort: number;
}

export interface ControlPortIntentDto {
  name: string;
  naturalId: number;
}

export interface ControlPortDto {
  controlPortName: string;
  intents: ControlPortIntentDto[];
  name: string;
  naturalId: number;
  portType: PortType;
  systemId: string;
  totalLinksAtPort: number;
}

export interface SpfModuleDto {
  alias: string;
  ckvs?: CkvDto[];
  containerSystemId: string;
  controlPorts: ControlPortDto[];
  dataPorts: DataPortDto[];
  maxControlPortsSupported: number;
  maxInputPortsSupported: number;
  maxOutputPortsSupported: number;
  moduleDefinitionSystemId: string;
  name: string;
  naturalId: number;
  parentSystemId?: string;
  relatedEndPointLinks?: EndPointLink[];
  subgraphSystemId: string;
  systemId: string;
  tags?: TagInfoDto[];
}

export interface KeyInfoDto {
  name: string;
  naturalId: number;
  systemId: string;
}

export interface ValueInfoDto {
  name: string;
  naturalId: number;
  systemId: string;
}

export interface SubsystemDto {
  controlPorts: ControlPortDto[];
  dataPorts: DataPortDto[];
  filteredKeys: KeyInfoDto[];
  name?: string;
  naturalId: number;
  parentSystemId?: string;
  systemId: string;
}

export interface DataLinkDto {
  destinationPortSystemId: string;
  destinationSystemId: string;
  linkType: LinkType;
  relatedEndPointLinks?: EndPointLink[];
  sourcePortSystemId: string;
  sourceSystemId: string;
  systemId: string;
}

export interface CreateDataLinkRequest {
  destinationModuleSystemId: string;
  destinationPortSystemId: string;
  linkType: LinkType;
  sourceModuleSystemId: string;
  sourcePortSystemId: string;
}

export interface CreateDataLinkWithSubsystemsRequest {
  destinationNodeSystemId: string;
  destinationPortSystemId: string;
  linkType: LinkType;
  sourceNodeSystemId: string;
  sourcePortSystemId: string;
}

export interface ControlLinkDto {
  destinationPortSystemId: string;
  destinationSystemId: string;
  linkType: ControlLinkType;
  relatedEndPointLinks?: EndPointLink[];
  sourcePortSystemId: string;
  sourceSystemId: string;
  systemId: string;
}

export interface CreateControlLinkRequest {
  endComponentSystemId: string;
  endPortSystemId: string;
  linkType: ControlLinkType;
  parentSystemId?: string;
  startComponentSystemId: string;
  startPortSystemId: string;
}

interface LinkWithUsecasesLinkDto {
  destinationPortSystemId: string;
  destinationSystemId: string;
  linkType: LinkType;
  sourcePortSystemId: string;
  sourceSystemId: string;
  systemId: string;
}

export interface DataLinkWithUsecasesDto {
  link: LinkWithUsecasesLinkDto;
  usecases: UsecaseDto[];
}

export interface ControlLinkWithUsecasesDto {
  link: LinkWithUsecasesLinkDto;
  usecases: UsecaseDto[];
}

export interface KeyValueInfo {
  key: KeyInfoDto;
  value: ValueInfoDto;
}

export interface ComponentCollectionDto {
  controlLinks: ControlLinkDto[];
  dataLinks: DataLinkDto[];
  spfModules: SpfModuleDto[];
  subsystems?: SubsystemDto[];
}

/** Link-creation response, including any warnings the backend returns. */
export interface LinkOperationResult extends ApiResult<ComponentCollectionDto> {
  issues?: ApiIssueItem[];
}
