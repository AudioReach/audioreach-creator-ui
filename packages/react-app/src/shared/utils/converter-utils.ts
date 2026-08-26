/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// converts a string input that may be decimal or hex ("0xFF" or "ff") into a number
export function ConvertStringToNumber(searchTerm: string): number | null {
  const strToLower = searchTerm.trim().toLowerCase();

  // if string is empty after trimming, it’s invalid
  if (!strToLower) {
    return null;
  }

  let result: number;

  // explicit hex prefix
  if (/^0x[0-9a-f]+$/.test(strToLower)) {
    result = parseInt(strToLower, 16);
  }
  // digits only -> decimal
  else if (/^\d+$/.test(strToLower)) {
    result = parseInt(strToLower, 10);
  } else {
    return null;
  }

  // Validate the result is within safe integer range
  if (!Number.isSafeInteger(result)) {
    // TODO: log this as a warining
    return null;
  }

  return result;
}

export function ConvertNumberToHexString(id: number): string | null {
  if (
    typeof id !== 'number' || // Validate input is a number
    isNaN(id) || // Check for NaN
    !isFinite(id) || // Check for infinity
    !Number.isSafeInteger(id) || // Validate the input is within safe integer range
    id < 0
  ) {
    // Check for negative numbers (hex representation typically for positive numbers)
    return null;
  }

  // Convert to hex string with proper formatting
  return `0x${id.toString(16).toUpperCase().padStart(8, '0')}`;
}

// Converts a number to a minimal-width hex string (0x1, 0x14, …) with no
// zero-padding — used for ids like port numbers where the padded 8-digit
// format used for module ids would be misleadingly wide.
export function ConvertNumberToMinimalHexString(id: number): string | null {
  if (
    typeof id !== 'number' ||
    isNaN(id) ||
    !isFinite(id) ||
    !Number.isSafeInteger(id) ||
    id < 0
  ) {
    return null;
  }

  return `0x${id.toString(16).toUpperCase()}`;
}
