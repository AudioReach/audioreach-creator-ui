/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Maps a raw error string (HTTP status text or thrown error message) to a user-facing message. */
export function toUserFriendlyError(raw: string, moduleName: string): string {
  const suffix = ` (${moduleName})`;
  if (/HTTP error: 4\d\d/i.test(raw)) {
    return `Module data not found for this module.${suffix}`;
  }
  if (/HTTP error: 5\d\d/i.test(raw)) {
    return `Server error loading module data. Try again later.${suffix}`;
  }
  if (/request timed out/i.test(raw)) {
    return `Request timed out. Check your connection and try again.${suffix}`;
  }
  if (/network error/i.test(raw)) {
    return `Network error. Check your connection and try again.${suffix}`;
  }
  return `Failed to load module data.${suffix}`;
}
