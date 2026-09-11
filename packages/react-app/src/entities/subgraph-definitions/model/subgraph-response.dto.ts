/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlLinkDto,
  DataLinkDto,
  EndPointLink,
} from '~entities/usecases/model/usecase-component.dto';

import type {SubgraphKvVectorDto} from './subgraph-kv.types';

/**
 * Declares the subgraph-detail payload used to enrich Graph Data placeholders.
 * `SGKV` remains transport data until Graph Data maps it to UI vector state.
 */
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
  name?: string;
  naturalId: number;
  relatedEndPointLinks?: EndPointLink[];
  /** Complete vectors returned with the subgraph detail response. */
  SGKV: SubgraphKvVectorDto[];
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
