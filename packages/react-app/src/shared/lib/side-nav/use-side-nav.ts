/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from "react"

import {logger} from "~shared/lib/logger"
import type {SideNavItem, TabWithSideNav} from "~shared/types/side-nav-types"

/**
 * Hook to easily implement TabWithSideNav interface in widgets
 *
 * @param items - Array of side nav items to display
 * @param handlers - Map of item IDs to handler functions
 * @param shortcuts - Optional map of keyboard shortcuts to handler functions
 * @returns Object with getSideNavItems, handleSideNavAction, and getKeyboardShortcuts methods
 *
 * @example
 * const sideNav = useSideNav(
 *   [
 *     { id: 'save', label: 'Save', icon: Save, shortcut: 'Ctrl+S' },
 *     { id: 'copy', label: 'Copy', icon: Copy, disabled: !hasSelection }
 *   ],
 *   {
 *     save: handleSave,
 *     copy: handleCopy
 *   },
 *   {
 *     'Ctrl+s': handleSave,
 *     'Ctrl+c': handleCopy
 *   }
 * )
 */
export function useSideNav(
  items: SideNavItem[],
  handlers: Record<string, () => void>,
  shortcuts?: Record<string, () => void>,
): TabWithSideNav {
  return useMemo(
    () => ({
      getKeyboardShortcuts: () => shortcuts || {},
      getSideNavItems: () => items,
      handleSideNavAction: (itemId: string) => {
        const handler = handlers[itemId]
        if (handler) {
          handler()
        } else {
          logger.warn(`No handler found for side nav action: ${itemId}`)
        }
      },
    }),
    [items, handlers, shortcuts],
  )
}
