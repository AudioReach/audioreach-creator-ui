/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlLinkDto,
  DataLinkDto,
  EndPointLink,
  KeyValueInfo,
} from '~entities/usecases/model/usecase-component.dto';

/**
 * Patch subgraph request data transfer object
 */
export interface SetSubgraphNameRequestDto {
  name: string;
}

/**
 * Subgraph response data transfer object
 */
export interface SubgraphResponseDto {
  id: number;
  name: string;
  relatedEndPointLinks: EndPointLink[];
  SGKV: KeyValueInfo[];
  subGraphSharedType: string;
  systemId: string;
}

/**
 * Subgraph pair response data transfer object
 */
export interface SubgraphPairResponseDto {
  controlLinks: ControlLinkDto[];
  dataLinks: DataLinkDto[];
  destinationSubgraphSystemId: string;
  sourceSubgraphSystemId: string;
}
