/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiResult} from './api-response.types';

/**
 * Process an API response and convert it to an ApiResult
 * @param response The fetch Response object
 * @returns ApiResult object
 */
export async function processApiResponse<T>(
  response: Response,
): Promise<ApiResult<T>> {
  // Handle HTTP errors
  if (!response.ok) {
    return {
      errors: [`HTTP error: ${response.status}`],
      message: `HTTP error: ${response.status} ${response.statusText}`,
      success: false,
    };
  }

  try {
    // Parse the response as JSON
    return await response.json();
  } catch {
    // Handle JSON parsing errors
    return {
      errors: ['Invalid JSON response'],
      message: 'Failed to parse response as JSON',
      success: false,
    };
  }
}
