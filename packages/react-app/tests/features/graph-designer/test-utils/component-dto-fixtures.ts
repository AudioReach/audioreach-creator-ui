/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  DataLinkDto,
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';

export function makeSpfModuleDto(
  overrides: Partial<SpfModuleDto> = {},
): SpfModuleDto {
  return {
    alias: '',
    changeInfo: {changeType: 'CREATE'},
    containerId: 10,
    controlPorts: [],
    dataPorts: [],
    heapId: 0,
    id: 1,
    maxControlPortsSupported: 0,
    maxInputPortsSupported: 0,
    maxOutputPortsSupported: 0,
    moduleId: 200,
    name: 'AudioDecoder',
    relatedEndPointLinks: [],
    subgraphId: 1,
    systemId: 'sys-mod-1',
    ...overrides,
  };
}

export function makeDataLinkDto(
  overrides: Partial<DataLinkDto> = {},
): DataLinkDto {
  return {
    changeInfo: {changeType: 'CREATE'},
    connectionType: 'MODULE_MODULE',
    destinationId: 2,
    destinationPortId: 20,
    isDangling: false,
    name: 'link',
    relatedEndPointLinks: [],
    sourceId: 1,
    sourcePortId: 10,
    systemId: 'link-1',
    ...overrides,
  };
}

export function makeSubsystemDto(
  overrides: Partial<SubsystemDto> = {},
): SubsystemDto {
  return {
    changeInfo: {changeType: 'CREATE'},
    controlPorts: [],
    dataPorts: [],
    filteredKeys: [],
    id: 99,
    name: 'Subsystem A',
    relatedEndPointLinks: [],
    systemId: 'sys-ss-1',
    ...overrides,
  };
}
