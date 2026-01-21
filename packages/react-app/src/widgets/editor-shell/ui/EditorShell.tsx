import {useEffect, useRef} from "react"

import {ConfigFileManager} from "~shared/config/config-manager"
import {ARCSideNav} from "~shared/controls/ARCSideNav"
import {GlobalToaster} from "~shared/controls/GlobalToaster"
import {
  SideNavProvider,
  useSideNavContext,
} from "~shared/controls/SideNavProvider"
import ProjectLayoutManager from "~shared/layout/ProjectLayoutMgr"
import {logger} from "~shared/lib/logger"
import {useKeyboardShortcuts} from "~shared/lib/side-nav"
import {Theme, useTheme} from "~shared/providers/ThemeProvider"
import {
  AppTab,
  useProjectLayoutStore,
} from "~shared/store/ProjectLayoutMgr.store"
import ArcStartPage from "~widgets/start-page/ui/ArcStartPage"

const EditorShellContent: React.FC = () => {
  const {keyboardShortcuts} = useSideNavContext()
  const [theme] = useTheme()
  const flexLayoutThemeClass =
    theme === Theme.DARK ? "flexlayout__theme_dark" : "flexlayout__theme_light"

  // Enable keyboard shortcuts for the active tab
  useKeyboardShortcuts(keyboardShortcuts, true)

  return (
    <div
      className={`flex h-screen flex-col ${flexLayoutThemeClass}`}
      style={{backgroundColor: "var(--color-surface-primary)"}}
    >
      <GlobalToaster />
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border-neutral-02)",
          color: "var(--color-text-neutral-primary)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="text-lg font-semibold"
            style={{color: "var(--color-text-neutral-primary)"}}
          >
            AudioReach™ Creator
          </div>
        </div>
      </div>

      <div
        className="relative flex flex-1"
        style={{backgroundColor: "var(--color-surface-primary)"}}
      >
        <div className="relative z-10">
          <ARCSideNav />
        </div>
        <div className="relative z-0 flex-1">
          <ProjectLayoutManager />
        </div>
      </div>
    </div>
  )
}

export const EditorShell: React.FC = () => {
  const store = useProjectLayoutStore()
  const initializedRef = useRef(false)

  // Initialize with a default app group and Start tab
  useEffect(() => {
    // Ensure initialization happens only once (important for React 18 Strict Mode)
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    // Check if default app group already exists
    const defaultAppGroup = store.appGroups.find(
      (ag) => ag.id === "default-app-group",
    )

    if (!defaultAppGroup) {
      // Create Start tab
      const startTab = new AppTab("Start", <ArcStartPage />)

      // Clone the component with the actual tab ID
      startTab.component = <ArcStartPage tabId={startTab.id} />

      // Create default app group with Start tab
      store.createAppGroup("default-app-group", "Application", [startTab])
    }
  }, [store])

  // Save configuration on app exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      // beforeunload is synchronous, so we can't reliably await async operations
      // Just trigger the save without waiting
      ConfigFileManager.instance.save().catch((error) => {
        logger.error("Failed to save configuration on exit", {
          action: "save_config_on_exit",
          component: "EditorShell",
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      // Also save on component unmount
      ConfigFileManager.instance.save().catch((error) => {
        logger.error("Failed to save configuration on unmount", {
          action: "save_config_on_unmount",
          component: "EditorShell",
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }, [])

  return (
    <SideNavProvider>
      <EditorShellContent />
    </SideNavProvider>
  )
}
