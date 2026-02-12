/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {QdsNotificationEmphasis} from "@qualcomm-ui/qds-core/inline-notification"
import {createToaster, Toaster} from "@qualcomm-ui/react/toast"

// Type definitions
export type ToastPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "bottom-start"
  | "bottom"
  | "bottom-end"

// Create global toaster instance
export const globalToaster = createToaster({
  overlap: true,
  placement: "top-end",
})

// Main toast function
export const showToast = (
  message: string,
  emphasis: QdsNotificationEmphasis,
  duration: number = 5000,
  placement?: ToastPlacement,
) => {
  // If placement is specified and different from default, create a new toaster
  if (placement && placement !== "top-end") {
    const customToaster = createToaster({
      overlap: true,
      placement,
    })

    customToaster.create({
      duration,
      label: message,
      type: emphasis,
    })
  } else {
    // Use global toaster for default placement
    globalToaster.create({
      duration,
      label: message,
      type: emphasis,
    })
  }
}

// GlobalToaster component to be rendered at app root
export const GlobalToaster: React.FC = () => {
  return <Toaster toaster={globalToaster} />
}
