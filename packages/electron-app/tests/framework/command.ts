/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TestContext} from './test-context';
import type {SafeMetadata} from './errors';

export type TestCommand<TOutput> = {
  readonly execute: (context: TestContext) => Promise<TOutput>;
  readonly id: string;
  readonly metadata?: SafeMetadata;
};

export type CommandFactory<TInput, TOutput> = (
  input: TInput,
) => TestCommand<TOutput>;
