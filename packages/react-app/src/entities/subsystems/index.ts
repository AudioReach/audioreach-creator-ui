/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export {
  createSubsystem,
  deleteSubsystem,
  moveSubsystemComponents,
  patchSubsystem,
} from './api/subsystems-api';
export type {
  CreateSubsystemRequestDto,
  CreateSubsystemResponseDto,
  DeleteSubsystemResponseDto,
  MoveSubsystemComponentParentDto,
  MoveSubsystemComponentsRequestDto,
  MoveSubsystemComponentsResponseDto,
  MoveSubsystemControlPortDto,
  MoveSubsystemDataPortDto,
  MoveSubsystemLinkDto,
  MoveSubsystemPortChangeDto,
  NormalizedMoveSubsystemComponentsResponseDto,
  NormalizedMoveSubsystemPortChangeDto,
  PatchSubsystemRequestDto,
  UpdateSubsystemResponseDto,
} from './model/subsystem-crud.dto';
