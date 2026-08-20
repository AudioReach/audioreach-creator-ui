/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  DataLinkDto,
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';

export function makeModuleInstance(
  overrides: Partial<ModuleInstance> = {},
): ModuleInstance {
  return {
    containerId: '10',
    displayName: 'AudioDecoder',
    inputPorts: [],
    moduleId: '200',
    moduleInstanceId: 'sys-mod-1',
    moduleName: 'AudioDecoder',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: '1',
    ...overrides,
  };
}

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
    subgraphId: 'sys-sg-1',
    systemId: 'sys-mod-1',
    ...overrides,
  };
}

export function makeDataLinkDto(
  overrides: Partial<DataLinkDto> = {},
): DataLinkDto {
  return {
    connectionType: 'MODULE_MODULE',
    destinationPortSystemId: '20',
    destinationSystemId: '2',
    isDangling: false,
    sourcePortSystemId: '10',
    sourceSystemId: '1',
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
