/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Contains device details used for display in the UI */
export default interface DeviceInfo {
  /** A short description of the device */
  description: string
  /** Unique id for rendering device info in a list */
  id: string
  /** The name of the device */
  name: string
}
