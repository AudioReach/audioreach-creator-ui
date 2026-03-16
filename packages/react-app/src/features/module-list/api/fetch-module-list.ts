/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiResult} from '~shared/api/api-response.types';
import {httpClient} from '~shared/api/http-client';

import type {TreeNode} from '../ui/ModuleList/module-list-types';

/**
 * Fetch module list data from the backend
 * @param projectId - The project file path to fetch modules for
 * @returns ApiResult containing array of TreeNode items
 */
export async function fetchModuleList(
  projectId: string,
): Promise<ApiResult<TreeNode[]>> {
  return httpClient.get<TreeNode[]>(`/projects/${projectId}/module-list`);
}
