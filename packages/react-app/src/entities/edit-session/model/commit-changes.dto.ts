/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Commit applies every staged action — there is no selective request payload. */
export type CommitChangesRequestDto = Record<string, never>;

/** Success is HTTP 200 with an empty body; outcome detail travels via issues. */
export type CommitChangesResponseDto = Record<string, never>;
