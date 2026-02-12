/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Info, TriangleAlert, X} from "lucide-react"

import {Icon} from "@qualcomm-ui/react/icon"

import {SeverityType} from "../model/validation-result.types"

/**
 * Returns the appropriate icon component based on severity level
 */
export const getSeverityIcon = (severity: string) => {
  switch (severity as SeverityType) {
    case SeverityType.Critical:
      return (
        <Icon
          icon={TriangleAlert}
          size="xs"
          style={{
            color: "var(--color-icon-support-danger)",
          }}
        />
      )
    case SeverityType.Error:
      return (
        <Icon
          icon={X}
          size="xs"
          style={{
            color: "var(--color-icon-support-danger)",
          }}
        />
      )
    case SeverityType.Warning:
      return (
        <Icon
          icon={TriangleAlert}
          size="xs"
          style={{
            color: "var(--color-icon-support-warning)",
          }}
        />
      )
    default:
      return (
        <Icon
          icon={Info}
          size="xs"
          style={{
            color: "var(--color-icon-neutral-secondary)",
          }}
        />
      )
  }
}
