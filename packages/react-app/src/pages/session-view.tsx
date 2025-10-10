import {type ReactNode, useEffect, useState} from "react"

import {Cable, Settings, Sliders} from "lucide-react"

import {QCard} from "@qui/react"

import {useSelectedModuleStore} from "~entities/examples/module"
import {useProjectStore} from "~entities/project"
import {GraphCanvas} from "~features/examples/graph"
import {ModulePropertiesPanel} from "~features/examples/module-properties/ui"
import {Sidebar} from "~widgets/sidebar"

import {useNavigate} from "../router"

export default function SessionViewPage(): ReactNode {
  const {selectedModuleId} = useSelectedModuleStore()
  const {currentProject} = useProjectStore()
  const [activeTab, setActiveTab] = useState("properties")
  const navigate = useNavigate()

  console.log("[SessionView] Rendering session view")

  const tabs = [
    {icon: Settings, id: "properties", label: "Properties"},
    {icon: Cable, id: "ports", label: "Ports"},
    {icon: Sliders, id: "parameters", label: "Parameters"},
  ]

  // Route protection: redirect to start page if no project is loaded
  useEffect(() => {
    if (!currentProject) {
      console.log("[SessionView] No project loaded, redirecting to start page")
      void navigate("/")
    } else {
      console.log(`[SessionView] Project loaded: ${currentProject.name}`)
    }
  }, [currentProject, navigate])

  // Don't render the page content if no project is loaded
  if (!currentProject) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <p className="q-font-heading-l mb-4">No project loaded</p>
          <p className="q-font-body-m text-gray-600">
            Redirecting to start page...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="w-[80%] flex-col">
          <div className="h-[calc(100vh-400px)] w-full pl-4">
            <QCard className="h-full w-full p-0" id="graphCanvas">
              <GraphCanvas />
            </QCard>
          </div>
          <div className="mt-4 h-[200px] w-full pl-4">
            <QCard className="h-full w-full p-4">
              <div className="q-font-heading-m mb-2">Logs</div>
              <div className="text-gray-500">Log panel coming soon...</div>
            </QCard>
          </div>
        </div>
        <div className="h-[calc(100vh-200px)] w-[20%] flex-1 overflow-auto pl-4">
          {selectedModuleId ? (
            <QCard className="h-full w-full">
              <div className="border-b">
                <div className="flex">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                        type="button"
                      >
                        <Icon size={16} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-4">
                {activeTab === "properties" && <ModulePropertiesPanel />}
                {activeTab === "ports" && (
                  <div className="text-center text-gray-500">
                    Ports editor coming soon...
                  </div>
                )}
                {activeTab === "parameters" && (
                  <div className="text-center text-gray-500">
                    Parameters editor coming soon...
                  </div>
                )}
              </div>
            </QCard>
          ) : (
            <div className="q-font-heading-l flex h-full items-center justify-center">
              <p>Select a module from the sidebar to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
