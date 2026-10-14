/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getAllUsecases, type UsecaseDto} from '~entities/usecases';
import {hasBlockingIssues} from '~shared/api';

/**
 * Loads only the usecases that contain the selected subgraph. The supported
 * backend filter avoids scanning the entire project usecase catalog.
 */
export async function loadSubgraphKvUsecaseSources(
  projectId: string,
  subgraphNaturalId: number | undefined,
): Promise<UsecaseDto[] | null> {
  if (subgraphNaturalId === undefined) {
    return null;
  }

  const result = await getAllUsecases(
    projectId,
    `subgraphNaturalId:${subgraphNaturalId}`,
  );
  if (hasBlockingIssues(result) || !result.data) {
    return null;
  }

  return result.data;
}
