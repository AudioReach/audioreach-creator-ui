import {httpClient} from "./http-client"
import type {UserLogRequestDto} from "./types"

/**
 * Service for sending logs to the backend
 */
export class LoggingApiService {
  /**
   * Send a single log entry to the backend
   * Fire-and-forget: does not throw errors, returns promise for internal handling
   * @param log The log entry to send
   * @returns Promise<boolean> indicating success
   */
  async sendLog(log: UserLogRequestDto): Promise<boolean> {
    try {
      const result = await httpClient.post<void>("/log", log)
      return result.success
    } catch (error) {
      console.warn("[LoggingAPI] Failed to send log:", error)
      return false
    }
  }
}

export const loggingApi = new LoggingApiService()
