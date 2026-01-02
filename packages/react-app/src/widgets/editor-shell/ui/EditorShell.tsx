import {useEffect, useRef} from "react"

import {ARCSideNav} from "~shared/controls/ARCSideNav"
import {GlobalToaster} from "~shared/controls/GlobalToaster"
import {
  SideNavProvider,
  useSideNavContext,
} from "~shared/controls/SideNavProvider"
import ProjectLayoutManager from "~shared/layout/ProjectLayoutMgr"
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
  }, [store]) // Empty dependency array is safe with the ref guard

  return (
    <SideNavProvider>
      <EditorShellContent />
    </SideNavProvider>
  )
}
