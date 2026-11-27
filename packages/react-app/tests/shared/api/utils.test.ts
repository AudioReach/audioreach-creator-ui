/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {processApiResponse} from '~shared/api/utils';

// jsdom has no global `Response`; json() rejects to mimic a real empty body.
function mockResponse(status: number): Response {
  return {
    headers: {get: jest.fn().mockReturnValue(null)},
    json: jest
      .fn()
      .mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
    ok: status >= 200 && status < 300,
    status,
    statusText: 'No Content',
  } as unknown as Response;
}

describe('processApiResponse', () => {
  it('returns an empty ApiResult for a 204 No Content response', async () => {
    const response = mockResponse(204);
    const result = await processApiResponse(response);
    expect(result.issues).toBeUndefined();
    expect(result.data).toBeUndefined();
  });
});
