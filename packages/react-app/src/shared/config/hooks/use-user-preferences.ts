/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useState} from "react"

import {ConfigFileManager} from "../config-manager"
import type {UserPreferences} from "../user-preferences-types"

/**
 * React hook for accessing and updating user preferences
 * Provides reactive access to project-specific user preferences
 *
 * @param projectId - The ID of the project to manage preferences for
 * @returns Object containing preferences and update functions
 */
export function useUserPreferences(projectId: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    ConfigFileManager.instance.getUserPreferences(projectId),
  )

  // Refresh preferences when projectId changes
  useEffect(() => {
    const newPreferences =
      ConfigFileManager.instance.getUserPreferences(projectId)
    setPreferences(newPreferences)
  }, [projectId])

  /**
   * Updates a single preference value
   * @param path - Dot-notation path to the preference (e.g., 'visualization.showControlLinks')
   * @param value - The new value for the preference
   */
  const updatePreference = useCallback(
    (path: string, value: any) => {
      const success = ConfigFileManager.instance.setUserPreference(
        projectId,
        path,
        value,
      )

      if (success) {
        // Update local state to trigger re-render
        const updatedPreferences =
          ConfigFileManager.instance.getUserPreferences(projectId)
        setPreferences(updatedPreferences)
      }

      return success
    },
    [projectId],
  )

  /**
   * Gets the current value of a specific preference
   * @param path - Dot-notation path to the preference (e.g., 'visualization.showControlLinks')
   * @returns The current value of the preference
   */
  const getPreference = useCallback(
    (path: string): any => {
      const pathParts = path.split(".")
      let value: any = preferences

      for (const part of pathParts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part]
        } else {
          return undefined
        }
      }

      return value
    },
    [preferences],
  )

  return {
    getPreference,
    preferences,
    updatePreference,
  }
}
