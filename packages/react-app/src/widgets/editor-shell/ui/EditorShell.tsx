import {useEffect, useRef} from "react"

import ProjectLayoutManager from "~shared/layout/ProjectLayoutMgr"
import {
  AppTab,
  useProjectLayoutStore,
} from "~shared/store/ProjectLayoutMgr.store"
import ArcStartPage from "~widgets/start-page/ui/ArcStartPage"

export const EditorShell: React.FC = () => {
  const store = useProjectLayoutStore()
  const initializedRef = useRef(false)

  // Initialize with a default app group and Start tab
  useEffect(() => {
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

      // Create default app group with Start tab
      store.createAppGroup("default-app-group", "Application", [startTab])
    }
  })

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-gray-800">
            AudioReach™ Creator
          </div>
        </div>
      </div>

      <div className="flex-1">
        <ProjectLayoutManager />
      </div>
    </div>
  )
}
