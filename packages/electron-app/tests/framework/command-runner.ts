/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {errors, test, type TestInfo} from '@playwright/test';

import type {TestCommand} from './command';
import {CommandError, type SafeMetadata} from './errors';
import {redactSecrets} from './redaction';
import type {TestContext} from './test-context';

type TestStep = <TOutput>(
  name: string,
  body: () => Promise<TOutput>,
) => Promise<TOutput>;

function isPlaywrightAssertionError(cause: unknown): boolean {
  return (
    cause instanceof Error &&
    'matcherResult' in cause &&
    cause.matcherResult !== undefined
  );
}

function isNativePlaywrightError(cause: unknown): boolean {
  return (
    isPlaywrightAssertionError(cause) ||
    cause instanceof errors.TimeoutError ||
    (cause instanceof Error && cause.name === 'TimeoutError')
  );
}

export class CommandRunner {
  constructor(
    private readonly testInfo: TestInfo,
    private readonly context?: TestContext,
    private readonly step: TestStep = test.step,
  ) {}

  async run<TOutput>(command: TestCommand<TOutput>): Promise<TOutput> {
    return this.step(command.id, async () => {
      const metadata = redactSecrets({
        commandId: command.id,
        ...command.metadata,
      }) as SafeMetadata;

      if (this.testInfo.attach) {
        await this.testInfo.attach('command-metadata', {
          body: JSON.stringify(metadata),
          contentType: 'application/json',
        });
      }

      try {
        if (!this.context) {
          throw new Error('CommandRunner requires a test context');
        }

        return await command.execute(this.context);
      } catch (cause) {
        if (isNativePlaywrightError(cause)) {
          throw cause;
        }

        throw new CommandError(command.id, metadata, cause);
      }
    });
  }
}
