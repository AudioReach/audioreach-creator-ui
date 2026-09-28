/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlLinkDto,
  DataLinkDto,
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';

export function makeModuleInstance(
  overrides: Partial<ModuleInstance> = {},
): ModuleInstance {
  return {
    containerSystemId: '10',
    displayName: 'AudioDecoder',
    inputPorts: [],
    moduleDefinitionSystemId: 'mod-def-200',
    moduleName: 'AudioDecoder',
    moduleType: '',
    naturalId: 200,
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphSystemId: '1',
    systemId: 'sys-mod-1',
    ...overrides,
  };
}

export function makeSpfModuleDto(
  overrides: Partial<SpfModuleDto> = {},
): SpfModuleDto {
  return {
    alias: '',
    containerSystemId: '10',
    controlPorts: [],
    dataPorts: [],
    maxControlPortsSupported: 0,
    maxInputPortsSupported: 0,
    maxOutputPortsSupported: 0,
    moduleDefinitionSystemId: 'mod-def-200',
    name: 'AudioDecoder',
    naturalId: 200,
    relatedEndPointLinks: [],
    subgraphSystemId: 'sys-sg-1',
    systemId: 'sys-mod-1',
    ...overrides,
  };
}

const DEFAULT_LINK_DTO = {
  destinationPortSystemId: '20',
  destinationSystemId: '2',
  linkType: 'NORMAL',
  sourcePortSystemId: '10',
  sourceSystemId: '1',
  systemId: 'link-1',
} as const;

export function makeDataLinkDto(
  overrides: Partial<DataLinkDto> = {},
): DataLinkDto {
  return {...DEFAULT_LINK_DTO, ...overrides};
}

export function makeControlLinkDto(
  overrides: Partial<ControlLinkDto> = {},
): ControlLinkDto {
  return {...DEFAULT_LINK_DTO, ...overrides};
}

export function makeSubsystemDto(
  overrides: Partial<SubsystemDto> = {},
): SubsystemDto {
  return {
    controlPorts: [],
    dataPorts: [],
    filteredKeys: [],
    name: 'Subsystem A',
    naturalId: 99,
    relatedEndPointLinks: [],
    systemId: 'sys-ss-1',
    ...overrides,
  };
}
