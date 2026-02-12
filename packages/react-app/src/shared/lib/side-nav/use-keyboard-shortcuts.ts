/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect} from "react"

import {logger} from "~shared/lib/logger"

/**
 * Hook to register keyboard shortcuts for the active tab
 *
 * @param shortcuts - Map of keyboard shortcuts to handler functions
 * @param enabled - Whether shortcuts are enabled (default: true)
 *
 * @example
 * useKeyboardShortcuts({
 *   "Ctrl+s": handleSave,
 *   "Ctrl+Shift+s": handleSaveAs,
 * })
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Build the key combination string
      // Normalize single letter keys to lowercase ONLY if Shift is not pressed
      // This handles Caps Lock while preserving intentional Shift+Letter combinations
      const normalizedKey =
        event.key.length === 1 && !event.shiftKey
          ? event.key.toLowerCase()
          : event.key

      const key = [
        event.ctrlKey && "Ctrl",
        event.metaKey && "Meta",
        event.shiftKey && "Shift",
        event.altKey && "Alt",
        normalizedKey,
      ]
        .filter(Boolean)
        .join("+")

      const handler = shortcuts[key]
      if (handler) {
        event.preventDefault()
        logger.verbose(`Keyboard shortcut triggered: ${key}`, {
          action: "keyboard_shortcut",
          component: "useKeyboardShortcuts",
        })
        handler()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, enabled])
}
