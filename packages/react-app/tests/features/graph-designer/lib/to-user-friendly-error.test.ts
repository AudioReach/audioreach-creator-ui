/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {toUserFriendlyError} from '~features/graph-designer/lib/to-user-friendly-error';

describe('toUserFriendlyError', () => {
  it('maps a 4xx HTTP error to a not-found message', () => {
    expect(toUserFriendlyError('HTTP error: 404', 'AudioDecoder')).toBe(
      'Module data not found for this module. (AudioDecoder)',
    );
  });

  it('maps a 5xx HTTP error to a server error message', () => {
    expect(toUserFriendlyError('HTTP error: 503', 'AudioDecoder')).toBe(
      'Server error loading module data. Try again later. (AudioDecoder)',
    );
  });

  it('maps a timeout message to a timeout error message', () => {
    expect(toUserFriendlyError('Request timed out', 'AudioDecoder')).toBe(
      'Request timed out. Check your connection and try again. (AudioDecoder)',
    );
  });

  it('maps a network error message to a network error message', () => {
    expect(
      toUserFriendlyError('Network error: fetch failed', 'AudioDecoder'),
    ).toBe(
      'Network error. Check your connection and try again. (AudioDecoder)',
    );
  });

  it('falls back to a generic message for an unrecognized raw error', () => {
    expect(toUserFriendlyError('Unknown error', 'AudioDecoder')).toBe(
      'Failed to load module data. (AudioDecoder)',
    );
  });

  it('is case-insensitive when matching the raw error', () => {
    expect(toUserFriendlyError('http error: 404', 'AudioDecoder')).toBe(
      'Module data not found for this module. (AudioDecoder)',
    );
  });
});
