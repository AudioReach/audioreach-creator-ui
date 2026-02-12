/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Log levels supported by the backend logging system
 */
export enum LogLevel {
  Verbose = "verbose",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Critical = "critical",
}

/**
 * Log request DTO matching backend UserLogRequestDto
 */
export interface UserLogRequestDto {
  action: string
  clientId: string
  component?: string
  error?: string
  logLevel: LogLevel
  msg: string
  projectId?: string
  tag?: string
  timestamp: Date
}

/**
 * Optional context that can be provided when logging
 */
export interface LogContext {
  action?: string
  component?: string
  error?: string
  projectId?: string
  tag?: string
}
