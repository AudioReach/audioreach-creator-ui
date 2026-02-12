/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ElectronApi, WindowWithApi} from "@audioreach-creator-ui/api-utils"

export const electronApi: ElectronApi | undefined = (
  typeof window === undefined ? undefined : (window as unknown as WindowWithApi)
)?.api
