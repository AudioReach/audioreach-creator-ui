import {type ReactNode, useEffect, useState} from "react"

import {Link, useLocation} from "react-router-dom"

import {
  QDivider,
  QHeader,
  QHeaderActions,
  QHeaderLogo,
  QHeaderNav,
  QHeaderNavItem,
} from "@qui/react"

import arcLogo from "~assets/qact_48.png"
import {mockBackend} from "~entities/examples/module/api/mock-backend"
import {ThemeToggle} from "../../theme"

export function Navbar(): ReactNode {
  const pathname = useLocation().pathname
  const [hasModules, setHasModules] = useState(false)
  const logo = <img alt="ARC Logo" height="28" src={arcLogo} width="28" />

  // Check for loaded modules periodically and on route changes
  useEffect(() => {
    const checkModules = () => {
      setHasModules(mockBackend.hasLoadedModules())
    }

    // Check immediately
    checkModules()

    // Set up interval to check periodically (for when modules are loaded)
    const interval = setInterval(checkModules, 1000)

    return () => clearInterval(interval)
  }, [pathname])

  return (
    <QHeader className="sticky top-0 z-20 w-full">
      <QHeaderLogo>
        <div className="q-heading-xs flex min-h-[36px] items-center gap-2 pl-2">
          {logo}
          <span className="whitespace-nowrap">AudioReach&trade; Creator</span>
        </div>
        <QDivider orientation="vertical" spacingBefore={24} />
      </QHeaderLogo>
      <QHeaderNav>
        <QHeaderNavItem active={pathname === "/"} as={Link} to="/">
          Home
        </QHeaderNavItem>
        {hasModules && (
          <QHeaderNavItem
            active={pathname === "/session-view"}
            as={Link}
            to="/session-view"
          >
            SessionView
          </QHeaderNavItem>
        )}
      </QHeaderNav>
      <QHeaderActions>
        <QDivider orientation="vertical" spacingAfter={16} spacingBefore={12} />
        <ThemeToggle />
      </QHeaderActions>
    </QHeader>
  )
}
