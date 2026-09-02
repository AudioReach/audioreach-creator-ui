/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {redactSecrets} from './redaction';

export type SerializableMetadata =
  | boolean
  | null
  | number
  | string
  | readonly SerializableMetadata[]
  | {readonly [key: string]: SerializableMetadata};

export type SafeMetadata = {
  readonly [key: string]: SerializableMetadata;
};

export class CommandError extends Error {
  readonly commandId: string;
  readonly metadata: SafeMetadata;
  readonly cause: unknown;

  constructor(commandId: string, metadata: SafeMetadata, cause: unknown) {
    super(`Command "${commandId}" failed`);
    this.cause = cause;
    this.commandId = commandId;
    this.metadata = redactSecrets(metadata) as SafeMetadata;
    this.name = 'CommandError';
  }
}
