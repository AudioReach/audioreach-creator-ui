/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlPortDto,
  DataPortDto,
  KeyInfo,
  PortIOType,
  PortType,
} from '~entities/usecases/model/usecase-component.dto';

export interface CreateSubsystemRequestDto {
  name?: string;
  parentSystemId?: string;
}

export interface CreateSubsystemResponseDto {
  name: string;
  naturalId: number;
  parentSystemId?: string;
  systemId: string;
}

export interface DeleteSubsystemResponseDto {
  name: string;
  naturalId: number;
  parentSystemId?: string;
  systemId: string;
}

export interface MoveSubsystemComponentParentDto {
  parentSystemId?: string;
  systemId: string;
}

export interface MoveSubsystemComponentsRequestDto {
  subgraphSystemIds?: string[];
  subsystemSystemIds?: string[];
  targetSubsystemSystemId: string | null;
}

export interface MoveSubsystemComponentsResponseDto {
  addedControlLinks?: MoveSubsystemLinkDto[];
  addedDataLinks?: MoveSubsystemLinkDto[];
  removedControlLinks?: string[];
  removedDataLinks?: string[];
  subsystemPortChanges?: MoveSubsystemPortChangeDto[];
  updatedModules?: MoveSubsystemComponentParentDto[];
  updatedSubsystems?: MoveSubsystemComponentParentDto[];
}

export interface NormalizedMoveSubsystemComponentsResponseDto {
  addedControlLinks: MoveSubsystemLinkDto[];
  addedDataLinks: MoveSubsystemLinkDto[];
  removedControlLinks: string[];
  removedDataLinks: string[];
  subsystemPortChanges: NormalizedMoveSubsystemPortChangeDto[];
  updatedModules: MoveSubsystemComponentParentDto[];
  updatedSubsystems: MoveSubsystemComponentParentDto[];
}

export interface MoveSubsystemLinkDto {
  destinationPortSystemId: string;
  destinationSystemId: string;
  isInterUsecase: boolean;
  sourcePortSystemId: string;
  sourceSystemId: string;
  systemId: string;
}

export interface MoveSubsystemPortChangeDto {
  addedControlPorts?: MoveSubsystemControlPortDto[];
  addedDataPorts?: MoveSubsystemDataPortDto[];
  removedControlPorts?: string[];
  removedDataPorts?: string[];
  systemId: string;
}

export interface MoveSubsystemControlPortDto {
  controlPortName?: string;
  name?: string;
  portType?: PortType;
  systemId: string;
}

export interface MoveSubsystemDataPortDto {
  name: string;
  portIoType: PortIOType;
  portType?: PortType;
  systemId: string;
}

export interface NormalizedMoveSubsystemPortChangeDto {
  addedControlPorts: MoveSubsystemControlPortDto[];
  addedDataPorts: MoveSubsystemDataPortDto[];
  removedControlPorts: string[];
  removedDataPorts: string[];
  systemId: string;
}

export interface PatchSubsystemRequestDto {
  controlPortCount?: number;
  inputDataPortCount?: number;
  name?: string;
  outputDataPortCount?: number;
}

export interface UpdateSubsystemResponseDto {
  controlPorts: ControlPortDto[];
  dataPorts: DataPortDto[];
  filteredKeys: KeyInfo[];
  name?: string;
  naturalId: number;
  parentSystemId?: string;
  systemId: string;
}
