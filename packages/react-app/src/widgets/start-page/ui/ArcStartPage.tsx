import {useMemo, useState} from "react"

import {Button} from "@qualcomm-ui/react/button"
import {Combobox} from "@qualcomm-ui/react/combobox"
import {Divider} from "@qualcomm-ui/react/divider"
import {ProgressRing} from "@qualcomm-ui/react/progress-ring"
import {useListCollection} from "@qualcomm-ui/react-core/collection"
import {useFilter} from "@qualcomm-ui/react-core/locale"
import {
  BookOpen,
  Database,
  FileText,
  FilterIcon,
  Folder,
  HelpCircle,
  Info,
  Logs,
  NotebookTabs,
  Search,
  Smartphone,
} from "lucide-react"
import {createPortal} from "react-dom"

import {ProjectService} from "~entities/project/services"
import ArcDeviceList from "~features/device-list/ui/ArcDeviceList"
import {useDeviceManager} from "~features/device-operations"
import {
  useProjectLifecycle,
  useProjectOpener,
} from "~features/project-operations"
import useArcRecentProjects from "~features/recent-files/hooks/useArcRecentProjects"
import ArcRecentProjects from "~features/recent-files/ui/ArcRecentProjects"
import ArcSearchBar from "~shared/controls/ArcSearchBar"
import {showToast} from "~shared/controls/GlobalToaster"
import {logger} from "~shared/lib/logger"
import {useRegisterSideNav, useSideNav} from "~shared/lib/side-nav"
import type ArcDeviceInfo from "~shared/types/arc-device-info"
import type ArcProjectInfo from "~shared/types/arc-project-info"

const projectTypes = ["Active", "Inactive", "Diff/Merge"]

export type ArcStartPageProps = {
  /** An event triggered by double-clicking a device card */
  onOpenDeviceProject?: (device: ArcDeviceInfo) => void
  /** An event triggered by double-clicking a project card */
  onOpenWorkspaceProject?: (project: ArcProjectInfo) => void
  /** Tab ID for side nav registration */
  tabId?: string
}

export default function ArcStartPage({
  onOpenDeviceProject,
  onOpenWorkspaceProject,
  tabId,
}: ArcStartPageProps) {
  const [showOnlyProjects, setShowOnlyProjects] = useState(false)
  const [showOnlyDevices, setShowOnlyDevices] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")

  const {projects: recentProjects, removeFromRecent} = useArcRecentProjects()

  // Project lifecycle management (screenshot capture on close)
  const {handleProjectClose, screenshotRegistry} = useProjectLifecycle()

  // Project opening operations
  const {loadingState, openRecentProject, openWorkspaceProject} =
    useProjectOpener({
      onProjectClose: handleProjectClose,
      onProjectOpened: onOpenWorkspaceProject,
      screenshotRegistry,
    })

  // Device management
  const {filteredDevices, openDevice} = useDeviceManager({
    onDeviceOpened: onOpenDeviceProject,
    searchTerm,
  })

  // Hooks for Combobox collection
  const {contains} = useFilter({sensitivity: "base"})
  const {collection} = useListCollection({
    filter: contains,
    initialItems: projectTypes,
  })

  const filteredProjects = useMemo(() => {
    if (recentProjects === undefined) {
      return []
    }

    return recentProjects.filter((project: ArcProjectInfo) => {
      // Check if searchTerm is valid
      if (!searchTerm || searchTerm.trim() === "") {
        return true
      }

      // Check if project.name exists before filtering
      if (!project.name) {
        return false
      }

      return project.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [recentProjects, searchTerm])

  function handleShowOnlyProjects() {
    setShowOnlyProjects(!showOnlyProjects)
    setShowOnlyDevices(false)
  }

  function handleShowOnlyDevices() {
    setShowOnlyDevices(!showOnlyDevices)
    setShowOnlyProjects(false)
  }

  async function handleShowInExplorer(projectId: string) {
    const project = recentProjects.find((p) => p.id === projectId)
    if (!project) {
      return
    }

    try {
      await ProjectService.showInExplorer(project.filepath)
    } catch (error) {
      logger.error("Error showing project in explorer", {
        action: "show_in_explorer",
        component: "ArcStartPage",
        error: error instanceof Error ? error.message : String(error),
      })
      showToast("Failed to open file in explorer", "danger")
    }
  }

  function handleOnFilterOptionChanged(value: string | undefined) {
    logger.verbose(`Filter option changed: ${value}`, {
      action: "filter_option_changed",
      component: "ArcStartPage",
    })
    // TODO: Implement filter logic when needed
  }

  // Side nav implementation - memoize items and handlers
  const sideNavItems = useMemo(
    () => [
      {
        icon: Search,
        id: "search",
        label: "Search",
        shortcut: "Ctrl+F",
      },
      {
        icon: Logs,
        id: "log-folder",
        label: "View Log Folder",
      },
      {
        group: "Help",
        icon: HelpCircle,
        id: "help",
        label: "Help",
        shortcut: "F1",
      },
      {
        group: "Help",
        icon: FileText,
        id: "release-notes",
        label: "Release Notes",
      },
      {
        group: "Help",
        icon: BookOpen,
        id: "user-guide",
        label: "User Guide",
      },
      {
        group: "Help",
        icon: Info,
        id: "about",
        label: "About",
      },
    ],
    [],
  )

  const sideNavHandlers = useMemo(
    () => ({
      about: () => {
        logger.info("About action triggered", {
          action: "about",
          component: "ArcStartPage",
        })
        showToast("About AudioReach Creator", "info")
      },
      help: () => {
        logger.info("Help action triggered", {
          action: "help",
          component: "ArcStartPage",
        })
        showToast("Help opened", "info")
      },
      "log-folder": () => {
        logger.info("Log folder triggered", {
          action: "log-folder",
          component: "ArcStartPage",
        })
        showToast("Log folder opened", "info")
      },
      "release-notes": () => {
        logger.info("Release notes action triggered", {
          action: "release_notes",
          component: "ArcStartPage",
        })
        showToast("Opening release notes", "info")
      },
      search: () => {
        logger.info("Search action triggered", {
          action: "search",
          component: "ArcStartPage",
        })
        showToast("Search functionality", "info")
      },
      "user-guide": () => {
        logger.info("User guide action triggered", {
          action: "user_guide",
          component: "ArcStartPage",
        })
        showToast("Opening user guide", "info")
      },
    }),
    [],
  )

  const sideNavShortcuts = useMemo(
    () => ({
      "Ctrl+f": () => {
        logger.info("Search shortcut triggered", {
          action: "search",
          component: "ArcStartPage",
        })
        showToast("Search functionality", "info")
      },
      "F1": () => {
        logger.info("Help shortcut triggered", {
          action: "help",
          component: "ArcStartPage",
        })
        showToast("Help opened", "info")
      },
    }),
    [],
  )

  const sideNav = useSideNav(sideNavItems, sideNavHandlers, sideNavShortcuts)

  // Register side nav with provider
  useRegisterSideNav(tabId, sideNav)

  return (
    <>
      {/* Loading Overlay - Rendered as Portal to cover entire application */}
      {loadingState.isLoading &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg bg-white p-8 shadow-xl">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div className="mb-2 text-lg font-semibold text-gray-800">
                  {loadingState.message || "Processing..."}
                </div>
                <div className="text-sm text-gray-600">
                  Please wait for the files to be processed ...
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div>
        {/* Top Buttons */}
        <div className="flex flex-row gap-2.5 p-2.5">
          <Button
            className="rounded-xl"
            emphasis="neutral"
            size="md"
            startIcon={NotebookTabs}
            variant="fill"
          >
            Release Notes
          </Button>
          <Button
            className="rounded-xl"
            emphasis="neutral"
            size="md"
            startIcon={NotebookTabs}
            variant="fill"
          >
            User Guide
          </Button>
        </div>

        <Divider />

        <div className="flex flex-col gap-2.5 p-2.5">
          {/* Search, Open File, and Device Manager */}
          <div className="flex flex-row gap-2.5">
            <h1 className="q-font-heading-sm-subtle content-center">
              Workspaces & Devices
            </h1>
            <ArcSearchBar
              onSearchChange={setSearchTerm}
              placeholder="Search"
              searchTerm={searchTerm}
            />
            <Button
              className="rounded-xl"
              emphasis="neutral"
              onClick={openWorkspaceProject}
              startIcon={Folder}
              variant="fill"
            >
              Open File
            </Button>
            <Button
              className="rounded-xl"
              emphasis="neutral"
              startIcon={Smartphone}
              variant="fill"
            >
              Device Manager
            </Button>
          </div>

          <div className="flex justify-end gap-2.5">
            <Button
              className="rounded-xl"
              emphasis="neutral"
              onClick={handleShowOnlyProjects}
              size="md"
              startIcon={Database}
              variant="fill"
            >
              Workspaces
            </Button>
            <Button
              className="rounded-xl"
              emphasis="neutral"
              onClick={handleShowOnlyDevices}
              size="md"
              startIcon={Smartphone}
              variant="fill"
            >
              Devices
            </Button>
          </div>
          <div className="flex justify-end gap-2.5">
            <Combobox
              className="w-[250px]"
              collection={collection}
              icon={FilterIcon}
              onInputValueChange={(value) =>
                handleOnFilterOptionChanged(value.inputValue)
              }
              placeholder="Filter by..."
              size="sm"
            />
          </div>
          {/* Recent Workspace and Device Project Lists */}
          {!showOnlyDevices && (
            <ArcRecentProjects
              onOpenProject={openRecentProject}
              onRemoveFromRecent={removeFromRecent}
              onShowInExplorer={handleShowInExplorer}
              projects={filteredProjects}
            />
          )}
          {!showOnlyProjects && (
            <ArcDeviceList
              devices={filteredDevices}
              onOpenDevice={openDevice}
            />
          )}
        </div>
      </div>
    </>
  )
}
