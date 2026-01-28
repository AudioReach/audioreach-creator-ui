import type {ApiResult} from "~shared/api/types"
import {logger} from "~shared/lib/logger"
import {useBackendConnectionStore} from "~shared/store/connection-store"

import {httpClient} from "./http-client"

/**
 * Registration response data from backend
 */
interface RegistrationResponseData {
  clientId: string
  clientName: string
  token: string
}

// const CLIENT_NAME_BASE =
//   (import.meta.env?.VITE_CLIENT_NAME as string | undefined)?.trim() ||
//   "audioreach-creator-ui"

const CLIENT_NAME_BASE = "audioreach-creator-ui"

// Module-level promise cache to prevent race conditions
let registrationPromise: Promise<boolean> | null = null

/**
 * Performs a one-time registration handshake with the backend.
 * Returns true when the client is registered and backend is available.
 * This function is safe to call multiple times; it will no-op when already registered.
 * Uses promise caching to prevent concurrent registration attempts.
 */
export async function ensureRegistered(): Promise<boolean> {
  // Check if already registered (fast path)
  const store = useBackendConnectionStore.getState()
  if (store.isRegistered) {
    return true
  }

  // If registration is already in progress, wait for it
  if (registrationPromise) {
    return registrationPromise
  }

  // Start new registration and cache the promise
  registrationPromise = (async () => {
    try {
      // Double-check registration status (another call might have completed)
      const currentStore = useBackendConnectionStore.getState()
      if (currentStore.isRegistered) {
        return true
      }

      // Attempt registration handshake
      const result: ApiResult<RegistrationResponseData> = await httpClient.post(
        "/auth/register",
        {
          clientName: CLIENT_NAME_BASE,
        },
      )

      logger.verbose("Registration response received", {
        action: "register_client",
        component: "RegisterClient",
        tag: JSON.stringify({
          data: result.data,
          message: result.message,
          success: result.success,
        }),
      })

      useBackendConnectionStore.getState().setLastCheckAt(Date.now())

      if (result.success) {
        // Extract client ID from backend response
        const clientId = result.data?.clientId

        if (!clientId) {
          logger.error("Registration succeeded but no client ID received", {
            action: "register_no_client_id",
            component: "RegisterClient",
          })
          useBackendConnectionStore
            .getState()
            .incrementFail("No client ID received from backend")
          useBackendConnectionStore
            .getState()
            .markUnavailable("No client ID received")
          // TODO: Not returing false for the demo purpose. Backemd does not have the registration logic implemented yet.
          // return false
        } else {
          // Initialize logger with backend client ID (enables backend logging)
          logger.setClientId(clientId)
        }

        logger.verbose("Registration successful, updating store", {
          action: "register_success",
          component: "RegisterClient",
        })
        useBackendConnectionStore.getState().setRegistered(true)
        useBackendConnectionStore.getState().markAvailable()
        useBackendConnectionStore.getState().resetFailures()
        logger.verbose("Store updated after successful registration", {
          action: "register_success",
          component: "RegisterClient",
          tag: JSON.stringify({
            isBackendAvailable:
              useBackendConnectionStore.getState().isBackendAvailable,
            isRegistered: useBackendConnectionStore.getState().isRegistered,
          }),
        })
        return true
      }

      // Registration failed with a handled response (e.g., 4xx/5xx)
      logger.error("Registration failed", {
        action: "register_failed",
        component: "RegisterClient",
        error: result.message,
      })
      useBackendConnectionStore
        .getState()
        .incrementFail(result.message || "Registration failed")
      useBackendConnectionStore.getState().markUnavailable(result.message)
      return false
    } catch (e) {
      // Network/timeout error propagated by httpClient
      const message = e instanceof Error ? e.message : String(e)
      logger.error("Exception during registration", {
        action: "register_exception",
        component: "RegisterClient",
        error: message,
      })
      useBackendConnectionStore.getState().setLastCheckAt(Date.now())
      useBackendConnectionStore.getState().incrementFail(message)
      useBackendConnectionStore.getState().markUnavailable(message)
      return false
    } finally {
      // Clear the promise when done (success or failure)
      registrationPromise = null
    }
  })()

  return registrationPromise
}

/**
 * Helper to explicitly reset connection status, e.g., after user clicks "Retry".
 * Also clears any cached registration promise to allow fresh retry.
 */
export function resetConnectionFailures(): void {
  const s = useBackendConnectionStore.getState()
  s.resetFailures()
  // Clear any cached registration promise to allow fresh retry
  registrationPromise = null
}

/**
 * Convenience accessor for current backend availability.
 */
export function isBackendAvailable(): boolean {
  return useBackendConnectionStore.getState().isBackendAvailable
}
