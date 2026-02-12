/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from "zustand"

export interface BackendConnectionState {
  failCount: number
  // actions
  incrementFail: (errorMessage?: string) => void
  // core state
  isBackendAvailable: boolean
  isRegistered: boolean
  lastCheckAt: number | null

  lastError: string | null
  markAvailable: () => void
  markUnavailable: (errorMessage?: string) => void
  resetFailures: () => void
  setLastCheckAt: (ts: number) => void
  setRegistered: (registered: boolean) => void
}

export const useBackendConnectionStore = create<BackendConnectionState>(
  (set, get) => ({
    failCount: 0,
    incrementFail: (errorMessage?: string) => {
      const current = get().failCount
      const next = current + 1
      set({
        failCount: next,
        isBackendAvailable: false,
        lastError: errorMessage ?? get().lastError,
      })
    },
    // Assume available at startup; will be updated on first call
    isBackendAvailable: true,
    isRegistered: false,
    lastCheckAt: null,

    lastError: null,

    markAvailable: () => {
      set({
        isBackendAvailable: true,
        lastError: null,
      })
    },

    markUnavailable: (errorMessage?: string) => {
      set({
        isBackendAvailable: false,
        isRegistered: false, // Reset registration when backend becomes unavailable
        lastError: errorMessage ?? null,
      })
    },

    resetFailures: () => {
      set({
        failCount: 0,
        lastError: null,
      })
    },

    setLastCheckAt: (ts: number) => {
      set({lastCheckAt: ts})
    },

    setRegistered: (registered: boolean) => {
      set({isRegistered: registered})
    },
  }),
)
