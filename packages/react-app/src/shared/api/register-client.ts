import type {ApiResult} from "~shared/api/types"
import {useBackendConnectionStore} from "~shared/store/connection-store"

import {httpClient} from "./http-client"

// const CLIENT_NAME_BASE =
//   (import.meta.env?.VITE_CLIENT_NAME as string | undefined)?.trim() ||
//   "audioreach-creator-ui"

const CLIENT_NAME_BASE = "audioreach-creator-ui"

/**
 * Performs a one-time registration handshake with the backend.
 * Returns true when the client is registered and backend is available.
 * This function is safe to call multiple times; it will no-op when already registered.
 */
export async function ensureRegistered(): Promise<boolean> {
  const store = useBackendConnectionStore.getState()

  console.log("[ensureRegistered] Called. Current state:", {
    failCount: store.failCount,
    isBackendAvailable: store.isBackendAvailable,
    isRegistered: store.isRegistered,
    lastError: store.lastError,
  })

  if (store.isRegistered) {
    console.log("[ensureRegistered] Already registered, returning true")
    return true
  }

  try {
    console.log(
      "[ensureRegistered] Attempting registration with clientName:",
      CLIENT_NAME_BASE,
    )
    // Attempt registration handshake
    const result: ApiResult = await httpClient.post("/auth/register", {
      clientName: CLIENT_NAME_BASE,
    })

    console.log("[ensureRegistered] Registration response:", {
      data: result.data,
      message: result.message,
      success: result.success,
    })

    useBackendConnectionStore.getState().setLastCheckAt(Date.now())

    if (result.success) {
      console.log(
        "[ensureRegistered] Registration successful! Updating store...",
      )
      useBackendConnectionStore.getState().setRegistered(true)
      useBackendConnectionStore.getState().markAvailable()
      useBackendConnectionStore.getState().resetFailures()
      console.log("[ensureRegistered] Store updated. New state:", {
        isBackendAvailable:
          useBackendConnectionStore.getState().isBackendAvailable,
        isRegistered: useBackendConnectionStore.getState().isRegistered,
      })
      return true
    }

    // Registration failed with a handled response (e.g., 4xx/5xx)
    console.error("[ensureRegistered] Registration failed:", result.message)
    useBackendConnectionStore
      .getState()
      .incrementFail(result.message || "Registration failed")
    useBackendConnectionStore.getState().markUnavailable(result.message)
    return false
  } catch (e) {
    // Network/timeout error propagated by httpClient
    const message = e instanceof Error ? e.message : String(e)
    console.error(
      "[ensureRegistered] Exception during registration:",
      message,
      e,
    )
    useBackendConnectionStore.getState().setLastCheckAt(Date.now())
    useBackendConnectionStore.getState().incrementFail(message)
    useBackendConnectionStore.getState().markUnavailable(message)
    return false
  }
}

/**
 * Helper to explicitly reset connection status, e.g., after user clicks "Retry".
 */
export function resetConnectionFailures(): void {
  const s = useBackendConnectionStore.getState()
  s.resetFailures()
}

/**
 * Convenience accessor for current backend availability.
 */
export function isBackendAvailable(): boolean {
  return useBackendConnectionStore.getState().isBackendAvailable
}
