import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

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

  // Subscribe to active tab changes
  useEffect(() => {
    // Set initial active tab first
    setActiveTab(useProjectLayoutStore.getState().activeTab)

    const unsubscribe = useProjectLayoutStore.subscribe((state) => {
      setActiveTab(state.activeTab)
    })

    return unsubscribe
  }, [])

  // Get items from registry based on active tab
  const items = useMemo(() => {
    if (!activeTab?.id) {
      return []
    }

    const impl = registry.get(activeTab.id)
    return impl ? impl.getSideNavItems() : []
  }, [activeTab?.id, registry])

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
      if (!activeTab?.id) {
        return
      }

      const impl = registry.get(activeTab.id)
      if (impl) {
        impl.handleSideNavAction(itemId)
      }
    },
    [activeTab?.id, registry],
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
        items,
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
