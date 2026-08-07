/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {SubgraphResponseDto} from '../model/subgraph-response.dto';

/**
 * Fetch all subgraphs for a project
 * @param projectId - The project identifier
 * @returns ApiResult containing array of subgraphs
 */
export async function getAllSubgraphs(
  projectId: string,
): Promise<ApiResult<SubgraphResponseDto[]>> {
  return httpClient.get<SubgraphResponseDto[]>(
    `/projects/${projectId}/subgraphs`,
  );
}
