/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {mapIssueToValidationResult} from '~features/graph-designer/lib/map-issue-to-validation-result';
import type {ApiIssue} from '~shared/api';

describe('mapIssueToValidationResult', () => {
  it('accepts shared ApiIssue and maps core fields', () => {
    const issue: ApiIssue = {
      code: 'OPEN_WARN_001',
      impactedEntity: {
        entityType: 'Subgraph',
        systemId: 'subgraph-1',
      },
      message: 'Workspace opened with warnings',
      severity: 'WARNING',
    };

    const result = mapIssueToValidationResult(issue);

    expect(result).toMatchObject({
      errorCode: 'OPEN_WARN_001',
      message: 'Workspace opened with warnings',
      severity: 'warning',
      subgraphId: 'subgraph-1',
    });
  });

  describe('severity mapping', () => {
    it('maps FATAL to critical', () => {
      const issue: ApiIssue = {
        code: 'ERR001',
        message: 'Fatal error',
        severity: 'FATAL',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.severity).toBe('critical');
    });

    it('maps ERROR to error', () => {
      const issue: ApiIssue = {
        code: 'ERR002',
        message: 'Error occurred',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.severity).toBe('error');
    });

    it('maps WARNING to warning', () => {
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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

      expect(result.connectionId).toBeUndefined();
      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
    });

    it('does not set id fields when impactedEntity is absent', () => {
      const issue: ApiIssue = {
        code: 'NO_ENTITY',
        message: 'No entity issue',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.connectionId).toBeUndefined();
      expect(result.moduleInstanceId).toBeUndefined();
      expect(result.subgraphId).toBeUndefined();
    });
  });

  describe('code to errorCode pass-through', () => {
    it('passes code through to errorCode', () => {
      const issue: ApiIssue = {
        code: 'CUSTOM_ERROR_CODE',
        message: 'Some error',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.errorCode).toBe('CUSTOM_ERROR_CODE');
    });
  });

  describe('fixOptions handling', () => {
    it('stores fix options and enables auto fix', () => {
      const issue: ApiIssue = {
        code: 'ARC-ROUTING-SAME-GKV-CHOICE-REQUIRED',
        fixOptions: [
          {
            commandPayload: {mode: 'KEEP_EXISTING'},
            commandType: 'ResolveSameGkvCollisionCommand',
            description: 'Keep existing usecase',
            requiredClientInputs: [],
            systemId: 'collision-1-KEEP_EXISTING',
          },
        ],
        message: 'Choose a routing option',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canAutoFix).toBe(true);
      expect(result.canShowControls).toBeUndefined();
      expect(result.fixOptions).toEqual(issue.fixOptions);
    });

    it('does not set canShowControls when fixOptions is absent', () => {
      const issue: ApiIssue = {
        code: 'NO_FIX',
        message: 'No fix available',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canShowControls).toBeUndefined();
    });

    it('does not set canShowControls when fixOptions is empty array', () => {
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
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
      const issue: ApiIssue = {
        code: 'AUTO001',
        message: 'Auto fix test',
        severity: 'ERROR',
      };

      const result = mapIssueToValidationResult(issue);

      expect(result.canAutoFix).toBeUndefined();
    });
  });
});
