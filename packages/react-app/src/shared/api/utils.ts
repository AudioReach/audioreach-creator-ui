/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiResult} from './api-response.types';
import {createTransportIssue} from './api-result-utils';

/**
 * Process an API response and convert it to an ApiResult
 * @param response The fetch Response object
 * @returns ApiResult object
 */
export async function processApiResponse<T>(
  response: Response,
): Promise<ApiResult<T>> {
  if (!response.ok) {
    return {
      issues: [
        createTransportIssue(
          `TRANSPORT_HTTP_${response.status}`,
          `HTTP error: ${response.status} ${response.statusText}`,
        ),
      ],
    };
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await response.formData();
      // Deliberate cast: multipart endpoints return FormData, not a JSON DTO.
      // Callers must pass T = FormData when using get<T>() against multipart endpoints.
      return {data: formData as unknown as T};
    } catch {
      return {
        issues: [
          createTransportIssue(
            'INVALID_MULTIPART',
            'Failed to parse multipart response',
          ),
        ],
      };
    }
  }

  try {
    return await response.json();
  } catch {
    return {
      issues: [
        createTransportIssue('INVALID_JSON', 'Failed to parse response as JSON'),
      ],
    };
  }
}
