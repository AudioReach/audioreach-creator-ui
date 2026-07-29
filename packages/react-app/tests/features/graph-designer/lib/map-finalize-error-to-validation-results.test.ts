/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~features/graph-designer/lib/map-issue-to-validation-result');

import type {ApiIssueItem} from '~entities/api-issues';
import {
  mapFinalizeErrorToValidationResults,
  type ReportableFinalizeError,
} from '~features/graph-designer/lib/map-finalize-error-to-validation-results';
import {mapIssueToValidationResult} from '~features/graph-designer/lib/map-issue-to-validation-result';

const mockMapIssueToValidationResult = jest.mocked(mapIssueToValidationResult);

function makeIssue(code: string): ApiIssueItem {
  return {
    code,
    message: `issue-${code}`,
    severity: 'ERROR',
  };
}

beforeEach(() => {
  mockMapIssueToValidationResult.mockReset();
  mockMapIssueToValidationResult.mockImplementation((issue) => ({
    errorCode: issue.code,
    message: issue.message,
    severity: 'error',
  }));
});

describe('mapFinalizeErrorToValidationResults', () => {
  describe('stageFailed', () => {
    it('produces one row with a composed errorDetails when there are no issues', () => {
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1', 'f2'],
        kind: 'stageFailed',
        message: 'stage failed',
        notYetStagedChangeIds: ['n1'],
        processedChangeIds: ['p1', 'p2'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].severity).toBe('error');
      expect(rows[0].errorCode).toBe('stage-changes-failed');
      expect(rows[0].message).toBe('stage failed');
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('p1'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('p2'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f1'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f2'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('n1'));
    });

    it('delegates each issue and prepends issue rows before the summary row', () => {
      const issues = [makeIssue('I1'), makeIssue('I2')];
      const error: ReportableFinalizeError = {
        failedChangeIds: [],
        issues,
        kind: 'stageFailed',
        message: 'stage failed',
        notYetStagedChangeIds: [],
        processedChangeIds: [],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(2);
      expect(rows).toHaveLength(3);
      expect(rows[0].errorCode).toBe('I1');
      expect(rows[1].errorCode).toBe('I2');
      expect(rows[2].errorCode).toBe('stage-changes-failed');
    });
  });

  describe('commitRejected', () => {
    it('no issues, missingDependencies only — single row naming deps, no Failed section', () => {
      const error: ReportableFinalizeError = {
        kind: 'commitRejected',
        message: 'commit rejected',
        missingDependencies: ['dep1', 'dep2'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('commit-changes-rejected');
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('dep1'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('dep2'));
      expect(rows[0].errorDetails).not.toEqual(
        expect.stringContaining('Failed'),
      );
    });

    it('no issues, failedChangeIds only — single row naming failed ids', () => {
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        kind: 'commitRejected',
        message: 'commit rejected',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('no issues, both missingDependencies and failedChangeIds — errorDetails names both', () => {
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        kind: 'commitRejected',
        message: 'commit rejected',
        missingDependencies: ['dep1'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('dep1'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('no issues, neither missingDependencies nor failedChangeIds — no errorDetails', () => {
      const error: ReportableFinalizeError = {
        kind: 'commitRejected',
        message: 'commit rejected',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('commit-changes-rejected');
      expect(rows[0].message).toBe('commit rejected');
      expect(rows[0].errorDetails).toBeUndefined();
    });

    it('issues + missingDependencies — issue rows plus summary row', () => {
      const issues = [makeIssue('I1')];
      const error: ReportableFinalizeError = {
        issues,
        kind: 'commitRejected',
        message: 'commit rejected',
        missingDependencies: ['dep1'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(2);
      expect(rows[0].errorCode).toBe('I1');
      expect(rows[1].errorCode).toBe('commit-changes-rejected');
      expect(rows[1].errorDetails).toEqual(expect.stringContaining('dep1'));
    });

    it('issues + failedChangeIds — issue rows plus summary row', () => {
      const issues = [makeIssue('I1')];
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        issues,
        kind: 'commitRejected',
        message: 'commit rejected',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(2);
      expect(rows[0].errorCode).toBe('I1');
      expect(rows[1].errorCode).toBe('commit-changes-rejected');
      expect(rows[1].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('issues + both missingDependencies and failedChangeIds — one summary row naming both', () => {
      const issues = [makeIssue('I1')];
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        issues,
        kind: 'commitRejected',
        message: 'commit rejected',
        missingDependencies: ['dep1'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(2);
      expect(rows[1].errorDetails).toEqual(expect.stringContaining('dep1'));
      expect(rows[1].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('issues + neither — issue rows only, no summary row', () => {
      const issues = [makeIssue('I1'), makeIssue('I2')];
      const error: ReportableFinalizeError = {
        issues,
        kind: 'commitRejected',
        message: 'commit rejected',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(2);
      expect(rows).toHaveLength(2);
      expect(rows[0].errorCode).toBe('I1');
      expect(rows[1].errorCode).toBe('I2');
    });

    it('empty issues array, no missingDependencies, no failedChangeIds — single summary row', () => {
      const error: ReportableFinalizeError = {
        issues: [],
        kind: 'commitRejected',
        message: 'commit rejected',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).not.toHaveBeenCalled();
      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('commit-changes-rejected');
      expect(rows[0].message).toBe('commit rejected');
      expect(rows[0].errorDetails).toBeUndefined();
    });
  });

  describe('commitPartial', () => {
    it('produces one warning row naming processed and failed ids', () => {
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        kind: 'commitPartial',
        message: 'commit partial',
        processedChangeIds: ['p1'],
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].severity).toBe('warning');
      expect(rows[0].errorCode).toBe('commit-changes-partial');
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('p1'));
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f1'));
    });
  });

  describe('discardDeterminate', () => {
    it('no issues, with failedChangeIds — single row with errorDetails', () => {
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        kind: 'discardDeterminate',
        message: 'discard failed',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('discard-changes-failed');
      expect(rows[0].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('issues + failedChangeIds — issue rows plus summary row', () => {
      const issues = [makeIssue('I1')];
      const error: ReportableFinalizeError = {
        failedChangeIds: ['f1'],
        issues,
        kind: 'discardDeterminate',
        message: 'discard failed',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(2);
      expect(rows[0].errorCode).toBe('I1');
      expect(rows[1].errorCode).toBe('discard-changes-failed');
      expect(rows[1].errorDetails).toEqual(expect.stringContaining('f1'));
    });

    it('issues only — issue rows, no summary row', () => {
      const issues = [makeIssue('I1'), makeIssue('I2')];
      const error: ReportableFinalizeError = {
        issues,
        kind: 'discardDeterminate',
        message: 'discard failed',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).toHaveBeenCalledTimes(2);
      expect(rows).toHaveLength(2);
    });

    it('empty issues array, no failedChangeIds — single summary row', () => {
      const error: ReportableFinalizeError = {
        issues: [],
        kind: 'discardDeterminate',
        message: 'discard failed',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(mockMapIssueToValidationResult).not.toHaveBeenCalled();
      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('discard-changes-failed');
      expect(rows[0].message).toBe('discard failed');
      expect(rows[0].errorDetails).toBeUndefined();
    });
  });

  describe('endSessionDeterminate', () => {
    it('code 422 maps to end-session-staged-changes-exist', () => {
      const error: ReportableFinalizeError = {
        code: '422',
        kind: 'endSessionDeterminate',
        message: 'staged changes exist',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].severity).toBe('error');
      expect(rows[0].errorCode).toBe('end-session-staged-changes-exist');
      expect(rows[0].message).toBe('staged changes exist');
      expect(rows[0].errorDetails).toBeUndefined();
    });

    it('code 400 maps to end-session-no-active-session', () => {
      const error: ReportableFinalizeError = {
        code: '400',
        kind: 'endSessionDeterminate',
        message: 'no active session',
      };

      const rows = mapFinalizeErrorToValidationResults(error);

      expect(rows).toHaveLength(1);
      expect(rows[0].errorCode).toBe('end-session-no-active-session');
    });
  });

  describe('entity id fields', () => {
    it('never sets moduleInstanceId/subgraphId/connectionId on summary rows', () => {
      const stageFailedRows = mapFinalizeErrorToValidationResults({
        failedChangeIds: [],
        kind: 'stageFailed',
        message: 'stage failed',
        notYetStagedChangeIds: [],
        processedChangeIds: [],
      });
      const commitRejectedRows = mapFinalizeErrorToValidationResults({
        failedChangeIds: ['f1'],
        kind: 'commitRejected',
        message: 'commit rejected',
      });
      const commitPartialRows = mapFinalizeErrorToValidationResults({
        failedChangeIds: [],
        kind: 'commitPartial',
        message: 'commit partial',
        processedChangeIds: [],
      });
      const discardDeterminateRows = mapFinalizeErrorToValidationResults({
        failedChangeIds: ['f1'],
        kind: 'discardDeterminate',
        message: 'discard failed',
      });
      const endSessionRows = mapFinalizeErrorToValidationResults({
        code: '422',
        kind: 'endSessionDeterminate',
        message: 'staged changes exist',
      });

      for (const rows of [
        stageFailedRows,
        commitRejectedRows,
        commitPartialRows,
        discardDeterminateRows,
        endSessionRows,
      ]) {
        expect(rows[0].moduleInstanceId).toBeUndefined();
        expect(rows[0].subgraphId).toBeUndefined();
        expect(rows[0].connectionId).toBeUndefined();
      }
    });
  });
});
