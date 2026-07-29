/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import {
  isBlockingIssue,
  partitionIssues,
} from '~features/graph-designer/lib/issue-gate';

describe('isBlockingIssue', () => {
  it('returns true when category is BLOCKING', () => {
    const issue: ApiIssueItem = {
      category: 'BLOCKING',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'WARNING',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  it('returns true when severity is FATAL', () => {
    const issue: ApiIssueItem = {
      category: 'NON_BLOCKING',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'FATAL',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  it('returns true when severity is ERROR', () => {
    const issue: ApiIssueItem = {
      category: 'NON_BLOCKING',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'ERROR',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  it('returns false when severity is WARNING and category is undefined', () => {
    const issue: ApiIssueItem = {
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'WARNING',
    };
    expect(isBlockingIssue(issue)).toBe(false);
  });

  it('returns true when severity is ERROR and category is NON_BLOCKING', () => {
    const issue: ApiIssueItem = {
      category: 'NON_BLOCKING',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'ERROR',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  it('returns true when severity is WARNING and category is BLOCKING', () => {
    const issue: ApiIssueItem = {
      category: 'BLOCKING',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'WARNING',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  it('returns true when severity is FATAL and category is anything', () => {
    const issue: ApiIssueItem = {
      category: 'DATA_LOSS',
      code: 'TEST_001',
      message: 'Test issue',
      severity: 'FATAL',
    };
    expect(isBlockingIssue(issue)).toBe(true);
  });

  describe('12-case cross-product matrix', () => {
    const testCases: Array<{
      category: 'BLOCKING' | 'NON_BLOCKING' | 'DATA_LOSS' | undefined;
      expected: boolean;
      severity: 'FATAL' | 'ERROR' | 'WARNING';
    }> = [
      {category: 'BLOCKING', expected: true, severity: 'FATAL'},
      {category: 'NON_BLOCKING', expected: true, severity: 'FATAL'},
      {category: 'DATA_LOSS', expected: true, severity: 'FATAL'},
      {category: undefined, expected: true, severity: 'FATAL'},
      {category: 'BLOCKING', expected: true, severity: 'ERROR'},
      {category: 'NON_BLOCKING', expected: true, severity: 'ERROR'},
      {category: 'DATA_LOSS', expected: true, severity: 'ERROR'},
      {category: undefined, expected: true, severity: 'ERROR'},
      {category: 'BLOCKING', expected: true, severity: 'WARNING'},
      {category: 'NON_BLOCKING', expected: false, severity: 'WARNING'},
      {category: 'DATA_LOSS', expected: false, severity: 'WARNING'},
      {category: undefined, expected: false, severity: 'WARNING'},
    ];

    it.each(testCases)(
      'severity=$severity, category=$category → $expected',
      ({category, expected, severity}) => {
        const issue: ApiIssueItem = {
          category,
          code: 'TEST_001',
          message: 'Test issue',
          severity,
        };
        expect(isBlockingIssue(issue)).toBe(expected);
      },
    );
  });
});

describe('partitionIssues', () => {
  it('returns empty arrays for empty input', () => {
    const result = partitionIssues([]);
    expect(result).toEqual({blocking: [], notices: []});
  });

  it('partitions issues into blocking and notices', () => {
    const issues: ApiIssueItem[] = [
      {
        category: 'BLOCKING',
        code: 'BLOCK_001',
        message: 'Blocking issue',
        severity: 'WARNING',
      },
      {
        category: 'NON_BLOCKING',
        code: 'NOTICE_001',
        message: 'Notice issue',
        severity: 'WARNING',
      },
      {
        category: 'NON_BLOCKING',
        code: 'BLOCK_002',
        message: 'Error issue',
        severity: 'ERROR',
      },
    ];

    const result = partitionIssues(issues);

    expect(result.blocking).toHaveLength(2);
    expect(result.notices).toHaveLength(1);
    expect(result.blocking[0].code).toBe('BLOCK_001');
    expect(result.blocking[1].code).toBe('BLOCK_002');
    expect(result.notices[0].code).toBe('NOTICE_001');
  });

  it('preserves input order within each output array', () => {
    const issues: ApiIssueItem[] = [
      {
        category: 'BLOCKING',
        code: 'B1',
        message: 'Blocking 1',
        severity: 'WARNING',
      },
      {
        code: 'N1',
        message: 'Notice 1',
        severity: 'WARNING',
      },
      {
        category: 'BLOCKING',
        code: 'B2',
        message: 'Blocking 2',
        severity: 'WARNING',
      },
      {
        code: 'N2',
        message: 'Notice 2',
        severity: 'WARNING',
      },
      {
        category: 'BLOCKING',
        code: 'B3',
        message: 'Blocking 3',
        severity: 'WARNING',
      },
    ];

    const result = partitionIssues(issues);

    expect(result.blocking.map((i: ApiIssueItem) => i.code)).toEqual([
      'B1',
      'B2',
      'B3',
    ]);
    expect(result.notices.map((i: ApiIssueItem) => i.code)).toEqual([
      'N1',
      'N2',
    ]);
  });

  it('handles readonly input array', () => {
    const issues: readonly ApiIssueItem[] = [
      {
        category: 'BLOCKING',
        code: 'B1',
        message: 'Blocking',
        severity: 'WARNING',
      },
      {
        code: 'N1',
        message: 'Notice',
        severity: 'WARNING',
      },
    ];

    const result = partitionIssues(issues);

    expect(result.blocking).toHaveLength(1);
    expect(result.notices).toHaveLength(1);
  });
});
