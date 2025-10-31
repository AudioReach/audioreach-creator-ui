import {useEffect, useRef} from "react"

import StoreFlexLayoutTabGroupManager from "~shared/layout/ui/LayoutTabGroupManager"
import {useApplicationStore} from "~shared/store"
import ArcStartPage from "~widgets/start-page/ui/ArcStartPage"

export const EditorShell: React.FC = () => {
  const {addAppTab, appGroup, setActiveAppTab} = useApplicationStore()

  const tabManagerRef = useRef<StoreFlexLayoutTabGroupManager>(null)
  const initializedRef = useRef(false)

  // Initialize with a single Start tab using the StartPage widget
  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    if (appGroup.appTabs.length === 0) {
      const startTab = {
        component: <ArcStartPage />,
        id: "start-page",
        isCloseable: true,
        tabKey: "start-page",
        title: "Start",
      }
      addAppTab(startTab)
      setActiveAppTab(startTab.id)
    }
  }, [appGroup.appTabs.length, addAppTab, setActiveAppTab])

  // Register the Start tab component with the layout manager
  useEffect(() => {
    if (!tabManagerRef.current) {
      return
    }
    const startTab = appGroup.appTabs.find((t) => t.id === "start-page")
    if (startTab) {
      tabManagerRef.current.setTabComponent(startTab.id, startTab.component)
    }
  }, [appGroup.appTabs])

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
        <StoreFlexLayoutTabGroupManager ref={tabManagerRef} />
      </div>
    </div>
  )
}
