/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import {mapIssueToValidationResult} from '~features/graph-designer/lib/map-issue-to-validation-result';

describe('mapIssueToValidationResult', () => {
  describe('severity mapping', () => {
    it('maps FATAL to critical', () => {
      const issue: ApiIssueItem = {
        code: 'ERR001',
        message: 'Fatal error',
        severity: 'FATAL',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.severity).toBe('critical');
    });

    it('maps ERROR to error', () => {
      const issue: ApiIssueItem = {
        code: 'ERR002',
        message: 'Error occurred',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.severity).toBe('error');
    });

    it('maps WARNING to warning', () => {
      const issue: ApiIssueItem = {
        code: 'WARN001',
        message: 'Warning message',
        severity: 'WARNING',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.severity).toBe('warning');
    });
  });

  describe('entity type mapping', () => {
    it('maps SpfModule entityType to moduleInstanceId', () => {
      const issue: ApiIssueItem = {
        code: 'MOD001',
        impactedEntity: {
          displayName: 'Module A',
          entityType: 'SpfModule',
          systemId: 'mod-sys-123',
        },
        message: 'Module issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.moduleInstanceId).toBe('mod-sys-123');
      expect(result.subgraphId).toBeUndefined();
      expect(result.connectionId).toBeUndefined();
    });

    it('maps Subgraph entityType to subgraphId', () => {
      const issue: ApiIssueItem = {
        code: 'SG001',
        impactedEntity: {
          displayName: 'Subgraph A',
          entityType: 'Subgraph',
          systemId: 'sg-sys-456',
        },
        message: 'Subgraph issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.subgraphId).toBe('sg-sys-456');
      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.connectionId).toBeUndefined();
    });

    it('maps DataLink entityType to connectionId', () => {
      const issue: ApiIssueItem = {
        code: 'DL001',
        impactedEntity: {
          displayName: 'Data Link',
          entityType: 'DataLink',
          systemId: 'dl-sys-789',
        },
        message: 'Data link issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.connectionId).toBe('dl-sys-789');
      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
    });

    it('maps ControlLink entityType to connectionId', () => {
      const issue: ApiIssueItem = {
        code: 'CL001',
        impactedEntity: {
          displayName: 'Control Link',
          entityType: 'ControlLink',
          systemId: 'cl-sys-101',
        },
        message: 'Control link issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.connectionId).toBe('cl-sys-101');
      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
    });

    it('does not set id fields for Unknown entityType', () => {
      const issue: ApiIssueItem = {
        code: 'UNK001',
        impactedEntity: {
          displayName: 'Unknown Entity',
          entityType: 'Unknown',
          systemId: 'unk-sys-202',
        },
        message: 'Unknown entity issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
      expect(result.connectionId).toBeUndefined();
    });

    it('does not set id fields when impactedEntity is absent', () => {
      const issue: ApiIssueItem = {
        code: 'NO_ENTITY',
        message: 'No entity issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
      expect(result.connectionId).toBeUndefined();
    });
  });

  describe('code to errorCode pass-through', () => {
    it('passes code through to errorCode', () => {
      const issue: ApiIssueItem = {
        code: 'CUSTOM_ERROR_CODE',
        message: 'Some error',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.errorCode).toBe('CUSTOM_ERROR_CODE');
    });
  });

  describe('fixOptions handling', () => {
    it('sets canShowControls to true when fixOptions is present and non-empty', () => {
      const issue: ApiIssueItem = {
        code: 'FIX001',
        fixOptions: [
          {
            commandPayload: {},
            commandType: 'FIX_COMMAND',
            description: 'Fix this issue',
            id: 'fix-1',
            requiredClientInputs: [],
          },
        ],
        message: 'Fixable error',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canShowControls).toBe(true);
    });

    it('does not set canShowControls when fixOptions is absent', () => {
      const issue: ApiIssueItem = {
        code: 'NO_FIX',
        message: 'No fix available',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canShowControls).toBeUndefined();
    });

    it('does not set canShowControls when fixOptions is empty array', () => {
      const issue: ApiIssueItem = {
        code: 'EMPTY_FIX',
        fixOptions: [],
        message: 'Empty fix options',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canShowControls).toBeUndefined();
    });
  });

  describe('message pass-through', () => {
    it('passes message through unchanged', () => {
      const issue: ApiIssueItem = {
        code: 'MSG001',
        message: 'This is the exact message',
        severity: 'WARNING',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.message).toBe('This is the exact message');
    });
  });

  describe('canAutoFix', () => {
    it('does not set canAutoFix', () => {
      const issue: ApiIssueItem = {
        code: 'AUTO001',
        message: 'Auto fix test',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canAutoFix).toBeUndefined();
    });
  });
});
