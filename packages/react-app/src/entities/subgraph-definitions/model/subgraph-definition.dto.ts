/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlLinkDto,
  DataLinkDto,
} from '~entities/usecases/model/usecase-component.dto';

/**
 * Subgraph data transfer object
 */
export interface SubgraphDto {
  description?: string;
  name: string;
  subgraphId: number;
  subgraphType: string;
}

/**
 * Subgraph pair data tranfer object
 */
export interface SubgraphPairDto {
  controlLinks: ControlLinkDto[];
  dataLinks: DataLinkDto[];
  destinationSubgraphSystemId: string;
  sourceSubgraphSystemId: string;
}
