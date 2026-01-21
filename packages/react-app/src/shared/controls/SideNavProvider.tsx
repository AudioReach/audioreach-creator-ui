import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {Moon, Settings, Sun} from "lucide-react"

import {showToast} from "~shared/controls/GlobalToaster"
import {Theme, useTheme} from "~shared/providers/ThemeProvider"
import {useProjectLayoutStore} from "~shared/store"
import type {SideNavItem, TabWithSideNav} from "~shared/types/side-nav-types"

interface SideNavContextType {
  items: SideNavItem[]
  keyboardShortcuts: Record<string, () => void>
  onItemSelect: (itemId: string) => void
  register: (tabId: string, impl: TabWithSideNav) => void
  unregister: (tabId: string) => void
}

const SideNavContext = createContext<SideNavContextType | null>(null)

export function useSideNavContext() {
  const context = useContext(SideNavContext)
  if (!context) {
    throw new Error("useSideNavContext must be used within SideNavProvider")
  }
  return context
}

interface SideNavProviderProps {
  children: ReactNode
}

export function SideNavProvider({children}: SideNavProviderProps) {
  const [registry, setRegistry] = useState(new Map<string, TabWithSideNav>())
  const [activeTab, setActiveTab] = useState<any>(null)
  const [theme, setTheme] = useTheme()

  // Subscribe to active tab changes
  useEffect(() => {
    // Set initial active tab first
    setActiveTab(useProjectLayoutStore.getState().activeTab)

    const unsubscribe = useProjectLayoutStore.subscribe((state) => {
      setActiveTab(state.activeTab)
    })

    return unsubscribe
  }, [])

  // Define default items that appear at the bottom for ALL widgets
  const defaultItems = useMemo(
    (): SideNavItem[] => [
      {
        icon: theme === Theme.LIGHT ? Moon : Sun,
        id: "__default_theme_toggle",
        label: theme === Theme.LIGHT ? "Dark Theme" : "Light Theme",
        // No group = ungrouped, will appear at bottom
      },
      {
        icon: Settings,
        id: "__default_settings",
        label: "Settings",
      },
    ],
    [theme],
  )

  // Get items from registry based on active tab
  const widgetItems = useMemo(() => {
    if (!activeTab?.id) {
      return []
    }

    const impl = registry.get(activeTab.id)
    return impl ? impl.getSideNavItems() : []
  }, [activeTab?.id, registry])

  // Merge widget items with default items (default items at the end)
  const allItems = useMemo(() => {
    return [...widgetItems, ...defaultItems]
  }, [widgetItems, defaultItems])

  // Get keyboard shortcuts from registry based on active tab
  const keyboardShortcuts = useMemo(() => {
    if (!activeTab?.id) {
      return {}
    }

    const impl = registry.get(activeTab.id)
    return impl?.getKeyboardShortcuts?.() || {}
  }, [activeTab?.id, registry])

  const handleItemSelect = useCallback(
    (itemId: string) => {
      // Handle default items first
      if (itemId === "__default_theme_toggle") {
        const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
        setTheme(newTheme)
        showToast(
          `Switched to ${newTheme === Theme.LIGHT ? "light" : "dark"} theme`,
          "success",
        )
        return
      }

      if (itemId === "__default_settings") {
        showToast("Settings (coming soon)", "info")
        return
      }

      // Handle widget-specific items
      if (!activeTab?.id) {
        return
      }

      const impl = registry.get(activeTab.id)
      if (impl) {
        impl.handleSideNavAction(itemId)
      }
    },
    [activeTab?.id, registry, theme, setTheme],
  )

  const register = useCallback((tabId: string, impl: TabWithSideNav) => {
    setRegistry((prev) => {
      const newRegistry = new Map(prev)
      newRegistry.set(tabId, impl)
      return newRegistry
    })
  }, [])

  const unregister = useCallback((tabId: string) => {
    setRegistry((prev) => {
      const newRegistry = new Map(prev)
      newRegistry.delete(tabId)
      return newRegistry
    })
  }, [])

  return (
    <SideNavContext.Provider
      value={{
        items: allItems,
        keyboardShortcuts,
        onItemSelect: handleItemSelect,
        register,
        unregister,
      }}
    >
      {children}
    </SideNavContext.Provider>
  )
}
