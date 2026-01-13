import {useEffect, useRef, useState} from "react"

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
import {
  AppTab,
  useProjectLayoutStore,
} from "~shared/store/ProjectLayoutMgr.store"
import ArcStartPage from "~widgets/start-page/ui/ArcStartPage"

const EditorShellContent: React.FC = () => {
  const {keyboardShortcuts} = useSideNavContext()

  // Enable keyboard shortcuts for the active tab
  useKeyboardShortcuts(keyboardShortcuts, true)

  return (
    <div className="flex h-screen flex-col bg-white">
      <GlobalToaster />
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-gray-800">
            AudioReach™ Creator
          </div>
        </div>
      </div>

      <div
        className="relative flex flex-1"
        style={{backgroundColor: `var(--color-background-neutral-01)`}}
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
  const [configReady, setConfigReady] = useState(false)

  // Initialize configuration on app startup
  useEffect(() => {
    const initConfig = async () => {
      try {
        await ConfigFileManager.instance.initializeConfig()
        setConfigReady(true)
      } catch (error) {
        logger.error("Failed to initialize config", {
          action: "initialize_config",
          component: "EditorShell",
          error: error instanceof Error ? error.message : String(error),
        })
        // Still set ready to allow app to function with defaults
        setConfigReady(true)
      }
    }
    initConfig()
  }, [])

  // Initialize with a default app group and Start tab
  useEffect(() => {
    // Wait for config to be ready
    if (!configReady) {
      return
    }

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
  }, [store, configReady])

  // Save configuration on app exit
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        await ConfigFileManager.instance.save()
      } catch (error) {
        logger.error(`Failed to save configuration on exit:${error}`)
      }
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

  if (!configReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading configuration...</div>
      </div>
    )
  }

  return (
    <SideNavProvider>
      <EditorShellContent />
    </SideNavProvider>
  )
}
