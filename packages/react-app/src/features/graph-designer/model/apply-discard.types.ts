/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import type {CreateUsecasesResponseDto} from '~entities/edit-session';
import type {SessionMode} from '~entities/project';

export type ReconcileOutcome =
  | {kind: 'finalizeDirectly'}
  | {issues: ApiIssueItem[]; kind: 'blocked'}
  | {
      kind: 'emptyReconcile';
      notices: ApiIssueItem[];
    }
  | {kind: 'reconcileTransportIndeterminate'}
  | {kind: 'reconcileFailed'; message: string}
  | {
      kind: 'review';
      notices: ApiIssueItem[];
      response: CreateUsecasesResponseDto;
    };

export type FinalizeOutcome =
  | {
      failedChangeIds: string[];
      issues?: ApiIssueItem[];
      kind: 'stageFailed';
      message: string;
      notYetStagedChangeIds: string[];
      processedChangeIds: string[];
    }
  | {kind: 'stageTransportIndeterminate'}
  | {
      failedChangeIds?: string[];
      issues?: ApiIssueItem[];
      kind: 'commitRejected';
      message: string;
      missingDependencies?: string[];
    }
  | {
      failedChangeIds: string[];
      kind: 'commitPartial';
      message: string;
      processedChangeIds: string[];
    }
  | {kind: 'commitTransportIndeterminate'}
  | {
      code: '422' | '400';
      kind: 'endSessionDeterminate';
      message: string;
    }
  | {kind: 'endSessionPostCommitReloadNeeded'}
  | {kind: 'endSessionTransportIndeterminate'}
  | {kind: 'committed'; sessionMode: SessionMode; summary: string};

export type DiscardOutcome =
  | {cascadedChangeIds: string[]; kind: 'discarded'}
  | {
      failedChangeIds?: string[];
      issues?: ApiIssueItem[];
      kind: 'discardDeterminate';
      message: string;
    }
  | {kind: 'discardChangesTransportIndeterminate'}
  | {
      code: '422' | '400';
      kind: 'endSessionDeterminate';
      message: string;
    }
  | {kind: 'endSessionPostDiscardReloadNeeded'}
  | {kind: 'discardTransportIndeterminate'};
