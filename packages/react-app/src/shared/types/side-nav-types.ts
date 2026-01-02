import type {LucideIconOrElement} from "@qualcomm-ui/react-core/lucide"

/**
 * Represents a single item in the side navigation menu
 */
export interface SideNavItem {
  /** Child items for hierarchical menus */
  children?: SideNavItem[]
  /** Whether the item is disabled */
  disabled?: boolean
  /** Optional group name for organizing items with dividers and labels */
  group?: string
  /** Optional icon from Qualcomm UI (accepts Lucide icons or React elements) */
  icon?: LucideIconOrElement
  /** Unique identifier for the item */
  id: string
  /** Display label for the item */
  label: string
  /** Keyboard shortcut display (e.g., "Ctrl+S") */
  shortcut?: string
  /** Optional custom tooltip text (defaults to label if not provided) */
  tooltip?: string
}

/**
 * Interface that tabs/widgets must implement to provide side nav items
 */
export interface TabWithSideNav {
  /** Returns keyboard shortcuts for this tab (optional) */
  getKeyboardShortcuts?(): Record<string, () => void>
  /** Returns the list of side nav items for this tab */
  getSideNavItems(): SideNavItem[]
  /** Handles when a side nav item is selected */
  handleSideNavAction(itemId: string): void
}

/**
 * Type guard to check if a tab implements TabWithSideNav
 */
export function isTabWithSideNav(tab: any): tab is TabWithSideNav {
  return (
    tab &&
    typeof tab.getSideNavItems === "function" &&
    typeof tab.handleSideNavAction === "function"
  )
}
