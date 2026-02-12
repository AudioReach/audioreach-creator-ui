/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from "react"

export const LogView: FC = () => {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-200"
      data-testid="log-view-placeholder"
    >
      <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
        Logs
      </div>
      <div className="flex-1 space-y-1 p-3 font-mono text-xs text-gray-600">
        <div>Log View Placeholder</div>
        <div>[12:00:00] Tool initialized...</div>
        <div>[12:00:05] Running action...</div>
        <div>[12:00:06] Completed.</div>
      </div>
    </div>
  )
}
