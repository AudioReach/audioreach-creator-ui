/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from "react"

export const ModuleList: FC = () => {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-200"
      data-testid="module-list-placeholder"
    >
      <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
        Modules
      </div>
      <div className="flex-1 p-3 text-sm text-gray-500">
        Module List Placeholder
      </div>
    </div>
  )
}
