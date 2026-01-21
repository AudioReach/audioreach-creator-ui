import {useEffect} from "react"

import {useSideNavContext} from "~shared/controls/SideNavProvider"
import {logger} from "~shared/lib/logger"
import type {TabWithSideNav} from "~shared/types/side-nav-types"

/**
 * Hook to register a widget's side nav implementation with the provider
 *
 * @param tabId - The unique ID of the tab (from BaseTabInterface)
 * @param impl - The TabWithSideNav implementation
 *
 * @example
 * const sideNav = useSideNav([...], {...})
 * useRegisterSideNav(tabId, sideNav)
 */
export function useRegisterSideNav(
  tabId: string | undefined,
  impl: TabWithSideNav,
) {
  const {register, unregister} = useSideNavContext()

  useEffect(() => {
    if (!tabId) {
      logger.verbose("Side nav registration skipped - no tabId provided", {
        action: "register_side_nav",
        component: "useRegisterSideNav",
      })
      return
    }

    logger.verbose(`Registering side nav for tab: ${tabId}`, {
      action: "register_side_nav",
      component: "useRegisterSideNav",
    })

    register(tabId, impl)

    return () => {
      logger.verbose(`Unregistering side nav for tab: ${tabId}`, {
        action: "unregister_side_nav",
        component: "useRegisterSideNav",
      })
      unregister(tabId)
    }
  }, [tabId, impl, register, unregister])
}
