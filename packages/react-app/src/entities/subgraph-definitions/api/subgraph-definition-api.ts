/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {SubgraphDto} from '../model/subgraph-definition.dto';

/**
 * Fetch all subgraphs for a project
 * @param projectId - The project identifier
 * @returns ApiResult containing array of subgraphs
 */
export async function getAllSubgraphs(
  projectId: string,
): Promise<ApiResult<SubgraphDto[]>> {
  return httpClient.get<SubgraphDto[]>(`/projects/${projectId}/subgraphs`);
}
