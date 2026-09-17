/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiIssue,
  createTransportIssue,
  getIssueMessage,
  hasBlockingIssues,
  hasIssues,
  isTransportFailure,
} from '~shared/api';



describe('api result utils', () => {
  const warning: ApiIssue = {
    code: 'WARN',
    message: 'Warning message',
    severity: 'WARNING',
  };

  const error: ApiIssue = {
    code: 'ERROR',
    message: 'Error message',
    severity: 'ERROR',
  };

  it('detects blocking issues by severity', () => {
    expect(hasBlockingIssues({issues: [warning]})).toBe(false);
    expect(hasBlockingIssues({issues: [warning, error]})).toBe(true);
  });

  it('returns the highest severity issue message', () => {
    expect(getIssueMessage({issues: [warning, error]}, 'Fallback')).toBe(
      'Error message',
    );
  });

  it('falls back when there are no issue messages', () => {
    expect(getIssueMessage({}, 'Fallback')).toBe('Fallback');
    expect(getIssueMessage({issues: []}, 'Fallback')).toBe('Fallback');
  });

  it('detects transport failures by synthetic issue code prefix', () => {
    expect(
      isTransportFailure({
        issues: [createTransportIssue('HTTP_ERROR', 'Not found')],
      }),
    ).toBe(true);
  });

  it('detects issue presence', () => {
    expect(hasIssues({issues: [warning]})).toBe(true);
    expect(hasIssues({issues: []})).toBe(false);
    expect(hasIssues({})).toBe(false);
  });
});
