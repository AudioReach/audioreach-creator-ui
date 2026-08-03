/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import type {
  CommitChangesResponseDto,
  CreateUsecasesRequestDto,
  CreateUsecasesResponseDto,
  DiscardChangesResponseDto,
  StageChangesResponseDto,
} from '~entities/edit-session';
import type {SessionResponseDto} from '~entities/project';
import {
  isTransportFailure,
  parseHttpStatus,
  runApplyReconcile,
  runDiscard,
  runFinalize,
} from '~features/graph-designer/model/apply-discard-coordinator';
import type {ApiResult} from '~shared/api';

function makeIssue(overrides: Partial<ApiIssueItem> = {}): ApiIssueItem {
  return {
    code: 'ISSUE_CODE',
    message: 'Something happened',
    severity: 'WARNING',
    ...overrides,
  };
}

function apiSuccess<T>(data: T, message = 'ok'): ApiResult<T> {
  return {data, message, success: true};
}

function apiFailure<T>(overrides: Partial<ApiResult<T>>): ApiResult<T> {
  return {message: 'failed', success: false, ...overrides};
}

const request: CreateUsecasesRequestDto = {
  activeSubgraphs: [],
  selectedUsecaseSystemIds: [],
};

describe('parseHttpStatus', () => {
  it('parses HTTP error: 400 from errors', () => {
    expect(
      parseHttpStatus({
        errors: ['HTTP error: 400 Bad Request'],
        message: '',
        success: false,
      }),
    ).toBe(400);
  });

  it('parses HTTP error: 422 from errors', () => {
    expect(
      parseHttpStatus({
        errors: ['HTTP error: 422 Unprocessable Entity'],
        message: '',
        success: false,
      }),
    ).toBe(422);
  });

  it('returns undefined for network error wire shape', () => {
    expect(
      parseHttpStatus({
        errors: ['Network error: fetch failed'],
        message: '',
        success: false,
      }),
    ).toBeUndefined();
  });

  it('returns undefined for timeout wire shape', () => {
    expect(
      parseHttpStatus({
        errors: ['Request timed out'],
        message: '',
        success: false,
      }),
    ).toBeUndefined();
  });

  it('parses HTTP error: 500 from errors', () => {
    expect(
      parseHttpStatus({
        errors: ['HTTP error: 500 Internal Server Error'],
        message: '',
        success: false,
      }),
    ).toBe(500);
  });

  it('parses HTTP error: 503 from errors', () => {
    expect(
      parseHttpStatus({
        errors: ['HTTP error: 503 Service Unavailable'],
        message: '',
        success: false,
      }),
    ).toBe(503);
  });
});

describe('isTransportFailure', () => {
  it('is false for a determinate HTTP 400 failure', () => {
    expect(
      isTransportFailure({
        errors: ['HTTP error: 400'],
        message: '',
        success: false,
      }),
    ).toBe(false);
  });

  it('is true for a network error', () => {
    expect(
      isTransportFailure({
        errors: ['Network error: ...'],
        message: '',
        success: false,
      }),
    ).toBe(true);
  });

  it('is true for a timeout', () => {
    expect(
      isTransportFailure({
        errors: ['Request timed out'],
        message: '',
        success: false,
      }),
    ).toBe(true);
  });

  it('is false for a successful response', () => {
    expect(isTransportFailure({data: {}, message: 'ok', success: true})).toBe(
      false,
    );
  });

  it('is false for a determinate HTTP 500 failure', () => {
    expect(
      isTransportFailure({
        errors: ['HTTP error: 500'],
        message: '',
        success: false,
      }),
    ).toBe(false);
  });
});

describe('runApplyReconcile', () => {
  it('returns finalizeDirectly with no API call when routing was not triggered', async () => {
    const createUsecases = jest.fn();

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: false},
    );

    expect(outcome).toEqual({kind: 'finalizeDirectly'});
    expect(createUsecases).not.toHaveBeenCalled();
  });

  it('returns reconcileTransportIndeterminate on create-usecases transport failure', async () => {
    const createUsecases = jest.fn().mockResolvedValue(
      apiFailure<CreateUsecasesResponseDto>({
        errors: ['Network error: fetch failed'],
      }),
    );

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: true},
    );

    expect(outcome).toEqual({kind: 'reconcileTransportIndeterminate'});
  });

  it('returns reconcileFailed on a determinate create-usecases failure', async () => {
    const createUsecases = jest.fn().mockResolvedValue(
      apiFailure<CreateUsecasesResponseDto>({
        errors: ['HTTP error: 500'],
        message: 'Failed to reconcile staged changes',
      }),
    );

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: true},
    );

    expect(outcome).toEqual({
      kind: 'reconcileFailed',
      message: 'Failed to reconcile staged changes',
    });
  });

  it('returns blocked with the full issue list when a blocking issue is present', async () => {
    const fatalIssue = makeIssue({message: 'Fatal problem', severity: 'FATAL'});
    const noticeIssue = makeIssue({message: 'Notice', severity: 'WARNING'});
    const response: CreateUsecasesResponseDto = {
      created: [],
      deleted: [],
      issues: [fatalIssue, noticeIssue],
      updated: [],
    };
    const createUsecases = jest.fn().mockResolvedValue(apiSuccess(response));

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: true},
    );

    expect(outcome).toEqual({
      issues: [fatalIssue, noticeIssue],
      kind: 'blocked',
    });
  });

  it('returns emptyReconcile when created/updated/deleted are all empty', async () => {
    const noticeIssue = makeIssue({message: 'Notice', severity: 'WARNING'});
    const response: CreateUsecasesResponseDto = {
      created: [],
      deleted: [],
      issues: [noticeIssue],
      updated: [],
    };
    const createUsecases = jest.fn().mockResolvedValue(apiSuccess(response));

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: true},
    );

    expect(outcome).toEqual({kind: 'emptyReconcile', notices: [noticeIssue]});
  });

  it('returns review with the raw response and only notice issues', async () => {
    const noticeIssue = makeIssue({message: 'Notice', severity: 'WARNING'});
    const response: CreateUsecasesResponseDto = {
      created: [
        {
          changeId: 'c1',
          keyValueCollection: [],
          systemId: 'uc1',
          usecaseType: 'Regular',
        },
      ],
      deleted: [],
      issues: [noticeIssue],
      updated: [],
    };
    const createUsecases = jest.fn().mockResolvedValue(apiSuccess(response));

    const outcome = await runApplyReconcile(
      {createUsecases},
      {projectId: 'proj-1', request, routingTriggered: true},
    );

    expect(outcome).toEqual({
      kind: 'review',
      notices: [noticeIssue],
      response,
    });
  });
});

describe('runFinalize', () => {
  function makeSessionResponse(
    overrides: Partial<SessionResponseDto> = {},
  ): SessionResponseDto {
    return {
      projectId: 'proj-1',
      sessionMode: 'READONLY',
      summary: 'done',
      ...overrides,
    };
  }

  it('commits and ends session when checkedChangeIds is empty', async () => {
    const stageChanges = jest.fn();
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>({
        failedChangeIds: [],
        message: 'committed',
        processedChangeIds: [],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValue(apiSuccess(makeSessionResponse()));

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {checkedChangeIds: [], processedFromPrevAttempt: [], projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      kind: 'committed',
      sessionMode: 'READONLY',
      summary: 'done',
    });
    expect(stageChanges).not.toHaveBeenCalled();
  });

  it('returns commitRejected when checkedChangeIds is empty and commit fails all', async () => {
    const stageChanges = jest.fn();
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>(
        {
          failedChangeIds: ['a', 'b'],
          message: 'validation failed',
          processedChangeIds: [],
          success: true,
        },
        'validation failed',
      ),
    );
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {checkedChangeIds: [], processedFromPrevAttempt: [], projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      failedChangeIds: ['a', 'b'],
      issues: undefined,
      kind: 'commitRejected',
      message: 'validation failed',
      missingDependencies: undefined,
    });
  });

  it('returns stageFailed and never calls commit when stage returns failed ids', async () => {
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>(
        {
          failedChangeIds: ['a'],
          message: 'stage failed',
          processedChangeIds: [],
          success: true,
        },
        'stage failed',
      ),
    );
    const commitChanges = jest.fn();
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({
      failedChangeIds: ['a'],
      issues: undefined,
      kind: 'stageFailed',
      message: 'stage failed',
      notYetStagedChangeIds: ['a'],
      processedChangeIds: [],
    });
    expect(commitChanges).not.toHaveBeenCalled();
  });

  it('returns stageTransportIndeterminate and publishes no rows on stage transport failure', async () => {
    const stageChanges = jest.fn().mockResolvedValue(
      apiFailure<StageChangesResponseDto>({
        errors: ['Network error: fetch failed'],
      }),
    );
    const commitChanges = jest.fn();
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({kind: 'stageTransportIndeterminate'});
    expect(commitChanges).not.toHaveBeenCalled();
  });

  it('stages only the not-yet-staged subset and recomputes on repeated failure', async () => {
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: ['b'],
        message: 'stage failed',
        processedChangeIds: [],
        success: true,
      }),
    );
    const commitChanges = jest.fn();
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a', 'b'],
        processedFromPrevAttempt: ['a'],
        projectId: 'proj-1',
      },
    );

    expect(stageChanges).toHaveBeenCalledWith('proj-1', ['b']);
    expect(outcome).toMatchObject({
      kind: 'stageFailed',
      notYetStagedChangeIds: ['b'],
    });
  });

  it('returns commitPartial and never calls endSession', async () => {
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: [],
        message: 'staged',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>(
        {
          failedChangeIds: ['b'],
          message: 'partial commit',
          processedChangeIds: ['a'],
          success: true,
        },
        'partial commit',
      ),
    );
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a', 'b'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({
      failedChangeIds: ['b'],
      kind: 'commitPartial',
      message: 'partial commit',
      processedChangeIds: ['a'],
    });
    expect(endSession).not.toHaveBeenCalled();
  });

  it('returns commitTransportIndeterminate and publishes no rows, never calls endSession', async () => {
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: [],
        message: 'staged',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const commitChanges = jest.fn().mockResolvedValue(
      apiFailure<CommitChangesResponseDto>({
        errors: ['Request timed out'],
      }),
    );
    const endSession = jest.fn();

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({kind: 'commitTransportIndeterminate'});
    expect(endSession).not.toHaveBeenCalled();
  });

  function fullHappyPathDeps(
    endSessionImpl: () => Promise<ApiResult<SessionResponseDto>>,
  ) {
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: [],
        message: 'staged',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>({
        failedChangeIds: [],
        message: 'committed',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest.fn(endSessionImpl);
    return {commitChanges, endSession, stageChanges};
  }

  it('returns endSessionDeterminate with code 422', async () => {
    const deps = fullHappyPathDeps(() =>
      Promise.resolve(
        apiFailure<SessionResponseDto>({errors: ['HTTP error: 422']}),
      ),
    );

    const outcome = await runFinalize(deps, {
      checkedChangeIds: ['a'],
      processedFromPrevAttempt: [],
      projectId: 'proj-1',
    });

    expect(outcome).toEqual({
      code: '422',
      kind: 'endSessionDeterminate',
      message: 'failed',
    });
  });

  it('returns endSessionDeterminate with code 400', async () => {
    const deps = fullHappyPathDeps(() =>
      Promise.resolve(
        apiFailure<SessionResponseDto>({errors: ['HTTP error: 400']}),
      ),
    );

    const outcome = await runFinalize(deps, {
      checkedChangeIds: ['a'],
      processedFromPrevAttempt: [],
      projectId: 'proj-1',
    });

    expect(outcome).toEqual({
      code: '400',
      kind: 'endSessionDeterminate',
      message: 'failed',
    });
  });

  it('returns reload-needed without retrying when end-session returns a determinate but uncategorized failure', async () => {
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['HTTP error: 500']}),
      );
    const deps = fullHappyPathDeps(endSession);

    const outcome = await runFinalize(deps, {
      checkedChangeIds: ['a'],
      processedFromPrevAttempt: [],
      projectId: 'proj-1',
    });

    expect(outcome).toEqual({kind: 'endSessionPostCommitReloadNeeded'});
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('retries end-session on transport failure and returns committed on retry success', async () => {
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
      )
      .mockResolvedValueOnce(apiSuccess(makeSessionResponse()));
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: [],
        message: 'staged',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>({
        failedChangeIds: [],
        message: 'committed',
        processedChangeIds: ['a'],
        success: true,
      }),
    );

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({
      kind: 'committed',
      sessionMode: 'READONLY',
      summary: 'done',
    });
    expect(endSession).toHaveBeenCalledTimes(2);
  });

  it('retries end-session on transport failure and returns reload-needed on determinate retry', async () => {
    const deps = fullHappyPathDeps(
      jest
        .fn()
        .mockResolvedValueOnce(
          apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
        )
        .mockResolvedValueOnce(
          apiFailure<SessionResponseDto>({errors: ['HTTP error: 400']}),
        ) as unknown as () => Promise<ApiResult<SessionResponseDto>>,
    );

    const outcome = await runFinalize(deps, {
      checkedChangeIds: ['a'],
      processedFromPrevAttempt: [],
      projectId: 'proj-1',
    });

    expect(outcome).toEqual({kind: 'endSessionPostCommitReloadNeeded'});
  });

  it('retries end-session on transport failure and returns transport-indeterminate if retry also fails', async () => {
    const deps = fullHappyPathDeps(
      jest
        .fn()
        .mockResolvedValueOnce(
          apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
        )
        .mockResolvedValueOnce(
          apiFailure<SessionResponseDto>({errors: ['Request timed out']}),
        ) as unknown as () => Promise<ApiResult<SessionResponseDto>>,
    );

    const outcome = await runFinalize(deps, {
      checkedChangeIds: ['a'],
      processedFromPrevAttempt: [],
      projectId: 'proj-1',
    });

    expect(outcome).toEqual({kind: 'endSessionTransportIndeterminate'});
  });

  it('recognizes the timeout wire shape as a transport failure and retries', async () => {
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Request timed out']}),
      )
      .mockResolvedValueOnce(apiSuccess(makeSessionResponse()));
    const stageChanges = jest.fn().mockResolvedValue(
      apiSuccess<StageChangesResponseDto>({
        failedChangeIds: [],
        message: 'staged',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const commitChanges = jest.fn().mockResolvedValue(
      apiSuccess<CommitChangesResponseDto>({
        failedChangeIds: [],
        message: 'committed',
        processedChangeIds: ['a'],
        success: true,
      }),
    );

    const outcome = await runFinalize(
      {commitChanges, endSession, stageChanges},
      {
        checkedChangeIds: ['a'],
        processedFromPrevAttempt: [],
        projectId: 'proj-1',
      },
    );

    expect(outcome).toEqual({
      kind: 'committed',
      sessionMode: 'READONLY',
      summary: 'done',
    });
    expect(endSession).toHaveBeenCalledTimes(2);
  });
});

describe('runDiscard', () => {
  function makeSessionResponse(
    overrides: Partial<SessionResponseDto> = {},
  ): SessionResponseDto {
    return {
      projectId: 'proj-1',
      sessionMode: 'READONLY',
      summary: 'done',
      ...overrides,
    };
  }

  it('returns discarded with cascadedChangeIds when discard and end-session succeed', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>({
        cascadedChangeIds: ['x'],
        failedChangeIds: [],
        message: 'discarded',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValue(apiSuccess(makeSessionResponse()));

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({cascadedChangeIds: ['x'], kind: 'discarded'});
  });

  it('returns discardDeterminate on business failure', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiFailure<DiscardChangesResponseDto>({
        data: {
          cascadedChangeIds: [],
          failedChangeIds: [],
          message: 'failed',
          processedChangeIds: [],
          success: false,
        },
      }),
    );
    const endSession = jest.fn();

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      failedChangeIds: [],
      issues: undefined,
      kind: 'discardDeterminate',
      message: 'failed',
    });
    expect(endSession).not.toHaveBeenCalled();
  });

  it('returns discardChangesTransportIndeterminate on discard transport failure and never calls endSession', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiFailure<DiscardChangesResponseDto>({
        errors: ['Network error: fetch failed'],
      }),
    );
    const endSession = jest.fn();

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({kind: 'discardChangesTransportIndeterminate'});
    expect(endSession).not.toHaveBeenCalled();
  });

  it('returns discardDeterminate with failedChangeIds when success is true but ids failed', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>(
        {
          cascadedChangeIds: [],
          failedChangeIds: ['a'],
          message: 'partially failed',
          processedChangeIds: [],
          success: true,
        },
        'partially failed',
      ),
    );
    const endSession = jest.fn();

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      failedChangeIds: ['a'],
      issues: undefined,
      kind: 'discardDeterminate',
      message: 'partially failed',
    });
    expect(endSession).not.toHaveBeenCalled();
  });

  it('returns endSessionDeterminate when discard succeeds but end-session returns 422', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>({
        cascadedChangeIds: [],
        failedChangeIds: [],
        message: 'discarded',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValue(
        apiFailure<SessionResponseDto>({errors: ['HTTP error: 422']}),
      );

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      code: '422',
      kind: 'endSessionDeterminate',
      message: 'failed',
    });
  });

  it('retries end-session on transport failure and returns discarded preserving cascadedChangeIds', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>({
        cascadedChangeIds: ['x', 'y'],
        failedChangeIds: [],
        message: 'discarded',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
      )
      .mockResolvedValueOnce(apiSuccess(makeSessionResponse()));

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({
      cascadedChangeIds: ['x', 'y'],
      kind: 'discarded',
    });
    expect(endSession).toHaveBeenCalledTimes(2);
  });

  it('retries end-session on transport failure and returns reload-needed on determinate retry', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>({
        cascadedChangeIds: [],
        failedChangeIds: [],
        message: 'discarded',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
      )
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['HTTP error: 400']}),
      );

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({kind: 'endSessionPostDiscardReloadNeeded'});
  });

  it('retries end-session on transport failure and returns discard-transport-indeterminate if retry also fails', async () => {
    const discardChanges = jest.fn().mockResolvedValue(
      apiSuccess<DiscardChangesResponseDto>({
        cascadedChangeIds: [],
        failedChangeIds: [],
        message: 'discarded',
        processedChangeIds: ['a'],
        success: true,
      }),
    );
    const endSession = jest
      .fn()
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Network error: ...']}),
      )
      .mockResolvedValueOnce(
        apiFailure<SessionResponseDto>({errors: ['Request timed out']}),
      );

    const outcome = await runDiscard(
      {discardChanges, endSession},
      {projectId: 'proj-1'},
    );

    expect(outcome).toEqual({kind: 'discardTransportIndeterminate'});
  });
});
