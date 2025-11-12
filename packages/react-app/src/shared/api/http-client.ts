import {useBackendConnectionStore} from "~shared/store/connection-store"

import type {ApiResult} from "./types"
import {processApiResponse} from "./utils"

/**
 * Resolve backend base URL from environment with a sensible default.
 * For Vite builds, define VITE_API_BASE_URL. Falls back to localhost for dev.
 */
export function getBackendBaseUrl(): string {
  // import.meta.env is provided by Vite at build time
  //const envUrl = import.meta.env?.VITE_API_BASE_URL as string | undefined
  //return envUrl?.trim() ? envUrl : "http://localhost:3500/arc-api/v1"
  return "http://localhost:3500/arc-api/v1"
}

export interface HttpClientConfig {
  apiVersion?: string
  baseUrl?: string
  maxRetries?: number
  retryBaseDelayMs?: number
  retryJitterMs?: number
  timeoutMs?: number
}

export interface RequestOverrides {
  apiVersion?: string
  headers?: Record<string, string>
  retries?: number
  retryBaseDelayMs?: number
  retryJitterMs?: number
  timeoutMs?: number
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

interface RequestOptions extends RequestOverrides {
  body?: unknown
  method: HttpMethod
}

/** Sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Exponential backoff with jitter */
function backoffDelay(
  attempt: number,
  baseMs: number,
  jitterMs: number,
): number {
  const exp = Math.min(attempt + 1, 8) // cap exponent
  const raw = baseMs * Math.pow(2, exp)
  const jitter = Math.floor(Math.random() * jitterMs)
  return raw + jitter
}

/**
 * Robust HTTP client with:
 * - Base URL resolution
 * - Timeout via AbortController
 * - Retries with exponential backoff + jitter on network/5xx errors
 * - Unified ApiResult mapping via processApiResponse
 */
export class HttpClient {
  private apiVersion: string
  private baseUrl: string
  private maxRetries: number
  private retryBaseDelayMs: number
  private retryJitterMs: number
  private timeoutMs: number

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? getBackendBaseUrl()
    this.timeoutMs = config.timeoutMs ?? 10000 // 10s default
    this.maxRetries = config.maxRetries ?? 3
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 500
    this.retryJitterMs = config.retryJitterMs ?? 250
    this.apiVersion = config.apiVersion ?? "v1"
  }

  async delete<T>(
    endpoint: string,
    overrides?: RequestOverrides,
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      apiVersion: overrides?.apiVersion,
      headers: overrides?.headers,
      method: "DELETE",
      retries: overrides?.retries,
      retryBaseDelayMs: overrides?.retryBaseDelayMs,
      retryJitterMs: overrides?.retryJitterMs,
      timeoutMs: overrides?.timeoutMs,
    })
  }

  async get<T>(
    endpoint: string,
    overrides?: RequestOverrides,
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      apiVersion: overrides?.apiVersion,
      headers: overrides?.headers,
      method: "GET",
      retries: overrides?.retries,
      retryBaseDelayMs: overrides?.retryBaseDelayMs,
      retryJitterMs: overrides?.retryJitterMs,
      timeoutMs: overrides?.timeoutMs,
    })
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    overrides?: RequestOverrides,
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      apiVersion: overrides?.apiVersion,
      body,
      headers: {
        "Content-Type": "application/json",
        ...(overrides?.headers ?? {}),
      },
      method: "PATCH",
      retries: overrides?.retries,
      retryBaseDelayMs: overrides?.retryBaseDelayMs,
      retryJitterMs: overrides?.retryJitterMs,
      timeoutMs: overrides?.timeoutMs,
    })
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    overrides?: RequestOverrides,
  ): Promise<ApiResult<T>> {
    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = body instanceof FormData
    const headers = isFormData
      ? {...(overrides?.headers ?? {})}
      : {
          "Content-Type": "application/json",
          ...(overrides?.headers ?? {}),
        }

    return this.request<T>(endpoint, {
      apiVersion: overrides?.apiVersion,
      body,
      headers,
      method: "POST",
      retries: overrides?.retries,
      retryBaseDelayMs: overrides?.retryBaseDelayMs,
      retryJitterMs: overrides?.retryJitterMs,
      timeoutMs: overrides?.timeoutMs,
    })
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions,
  ): Promise<ApiResult<T>> {
    const baseRoot = this.baseUrl.replace(/\/v\d+\/?$/, "").replace(/\/+$/, "")
    const chosenVersion = options.apiVersion ?? this.apiVersion
    const ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const normalizedEndpoint = /^\/v\d+(?:\/|$)/.test(ep)
      ? ep
      : `/${chosenVersion}${ep}`
    const url = `${baseRoot}${normalizedEndpoint}`
    const retries = options.retries ?? this.maxRetries
    const timeoutMs = options.timeoutMs ?? this.timeoutMs
    console.log(`[request] url:`, url)
    console.log("[request] method", options.method)
    if (options.body !== undefined) {
      console.log("[request] body", JSON.stringify(options.body))
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        // Don't stringify FormData - pass it directly
        const isFormData = options.body instanceof FormData
        let requestBody: BodyInit | undefined
        if (options.body !== undefined) {
          requestBody = isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body)
        }
        const response = await fetch(url, {
          body: requestBody,
          headers: options.headers,
          method: options.method,
          signal: controller.signal,
        })
        clearTimeout(timer)

        // Retry only on 5xx server errors
        const isServerError = !response.ok && response.status >= 500

        const result = await processApiResponse<T>(response)

        console.log("[request] parsing response result", result.success)
        console.log("[request] Server error", isServerError)

        // Update connection state based on response
        if (result.success) {
          // Successful response - backend is available
          const store = useBackendConnectionStore.getState()
          if (!store.isBackendAvailable) {
            store.markAvailable()
          }
          if (store.failCount > 0) {
            store.resetFailures()
          }
        } else if (isServerError) {
          // Server error (5xx) - mark backend as unavailable
          // This will also reset registration automatically
          const store = useBackendConnectionStore.getState()
          store.markUnavailable(result.message || "Server error")
          store.incrementFail(result.message || "Server error")
        }

        if (!result.success && isServerError && attempt < retries) {
          const delay = backoffDelay(
            attempt,
            options.retryBaseDelayMs ?? this.retryBaseDelayMs,
            options.retryJitterMs ?? this.retryJitterMs,
          )
          await sleep(delay)
          continue
        }
        console.log("[request] return result", result.data)
        return result
      } catch (error) {
        clearTimeout(timer)
        const isAbort = (error as any)?.name === "AbortError"
        const shouldRetry = !isAbort && attempt < retries

        if (shouldRetry) {
          const delay = backoffDelay(
            attempt,
            options.retryBaseDelayMs ?? this.retryBaseDelayMs,
            options.retryJitterMs ?? this.retryJitterMs,
          )
          await sleep(delay)
          continue
        }

        // Network error or timeout - mark backend as unavailable
        // This will also reset registration automatically
        const message = isAbort
          ? "Request timed out"
          : `Network error: ${String(error)}`
        const store = useBackendConnectionStore.getState()
        store.markUnavailable(message)
        store.incrementFail(message)

        return {errors: [message], message, success: false}
      }
    }

    // All retries exhausted - mark backend as unavailable
    const message = "Request failed after maximum retries"
    const store = useBackendConnectionStore.getState()
    store.markUnavailable(message)
    store.incrementFail(message)

    return {message, success: false}
  }
}

/** Default shared instance */
export const httpClient = new HttpClient()
