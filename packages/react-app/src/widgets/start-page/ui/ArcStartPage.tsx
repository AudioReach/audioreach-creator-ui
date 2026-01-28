import {useMemo, useState} from "react"

import {
  BookOpen,
  ChevronRight,
  Database,
  FileText,
  FilterIcon,
  Folder,
  Grid3x3,
  HelpCircle,
  Info,
  List,
  Logs,
  Search,
  Smartphone,
} from "lucide-react"
import {createPortal} from "react-dom"

import {Button, IconButton} from "@qualcomm-ui/react/button"
import {Combobox} from "@qualcomm-ui/react/combobox"
import {ProgressRing} from "@qualcomm-ui/react/progress-ring"
import {useListCollection} from "@qualcomm-ui/react-core/collection"
import {useFilter} from "@qualcomm-ui/react-core/locale"

import {ProjectService} from "~entities/project/services"
import {useDeviceManager} from "~features/device-operations"
import {
  useProjectLifecycle,
  useProjectOpener,
} from "~features/project-operations"
import useArcRecentProjects from "~features/recent-files/hooks/useArcRecentProjects"
import UnifiedGridView from "~features/recent-files/ui/UnifiedGridView"
import UnifiedListView from "~features/recent-files/ui/UnifiedListView"
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
  const [showProjects, setShowProjects] = useState(true)
  const [showDevices, setShowDevices] = useState(true)
  const [activeTab, setActiveTab] = useState<
    "release-notes" | "user-guide" | null
  >(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
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
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              backdropFilter: "blur(2px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              className="rounded-lg p-8 shadow-xl"
              style={{backgroundColor: "var(--color-surface-raised)"}}
            >
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div
                  className="mb-2 text-lg font-semibold"
                  style={{color: "var(--color-text-neutral-primary)"}}
                >
                  {loadingState.message || "Processing..."}
                </div>
                <div
                  className="text-sm"
                  style={{color: "var(--color-text-neutral-secondary)"}}
                >
                  Please wait for the files to be processed ...
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div>
        {/* Top Navigation Bar */}
        <div
          className="flex gap-2 p-2.5"
          style={{borderBottom: "1px solid var(--color-border-neutral-02)"}}
        >
          <Button
            emphasis={showProjects ? "primary" : "neutral"}
            onClick={() => {
              setShowProjects(!showProjects)
              setActiveTab(null)
            }}
            size="md"
            startIcon={Database}
            variant={showProjects ? "fill" : "outline"}
          >
            Projects
          </Button>
          <Button
            emphasis={showDevices ? "primary" : "neutral"}
            onClick={() => {
              setShowDevices(!showDevices)
              setActiveTab(null)
            }}
            size="md"
            startIcon={Smartphone}
            variant={showDevices ? "fill" : "outline"}
          >
            Devices
          </Button>
          <Button
            emphasis={activeTab === "release-notes" ? "primary" : "neutral"}
            onClick={() => {
              setActiveTab("release-notes")
              setShowProjects(false)
              setShowDevices(false)
            }}
            size="md"
            startIcon={FileText}
            variant={activeTab === "release-notes" ? "fill" : "outline"}
          >
            Release Notes
          </Button>
          <Button
            emphasis={activeTab === "user-guide" ? "primary" : "neutral"}
            onClick={() => {
              setActiveTab("user-guide")
              setShowProjects(false)
              setShowDevices(false)
            }}
            size="md"
            startIcon={BookOpen}
            variant={activeTab === "user-guide" ? "fill" : "outline"}
          >
            User Guide
          </Button>
        </div>

        {/* Main Control Row */}
        <div className="flex items-center gap-3 p-2.5">
          {/* Search */}
          <div className="flex-1">
            <ArcSearchBar
              onSearchChange={(value) => setSearchTerm(value)}
              placeholder="Search"
              searchTerm={searchTerm}
            />
          </div>

          {/* Open File */}
          <Button
            emphasis="neutral"
            endIcon={ChevronRight}
            onClick={openWorkspaceProject}
            size="md"
            startIcon={Folder}
            variant="fill"
          >
            Open File
          </Button>

          {/* Device Manager */}
          <Button
            emphasis="neutral"
            endIcon={ChevronRight}
            size="md"
            startIcon={Smartphone}
            variant="fill"
          >
            Device Manager
          </Button>

          {/* List View Toggle */}
          <IconButton
            aria-label="List View"
            emphasis={viewMode === "list" ? "primary" : "neutral"}
            icon={List}
            onClick={() => setViewMode("list")}
            size="md"
            title="List View"
            variant={viewMode === "list" ? "fill" : "outline"}
          />

          {/* Grid View Toggle */}
          <IconButton
            aria-label="Grid View"
            emphasis={viewMode === "grid" ? "primary" : "neutral"}
            icon={Grid3x3}
            onClick={() => setViewMode("grid")}
            size="md"
            title="Grid View"
            variant={viewMode === "grid" ? "fill" : "outline"}
          />

          {/* Filter */}
          <Combobox
            aria-label="Filter by"
            className="w-48"
            collection={collection}
            icon={FilterIcon}
            onInputValueChange={(value) =>
              handleOnFilterOptionChanged(value.inputValue)
            }
            placeholder="Filter by..."
            size="md"
          />
        </div>

        {/* Content Area */}
        <div className="p-2.5">
          {/* Unified Projects & Devices View */}
          {!activeTab && (
            <>
              {viewMode === "grid" ? (
                <UnifiedGridView
                  devices={filteredDevices}
                  onOpenDevice={openDevice}
                  onOpenProject={openRecentProject}
                  onRemoveFromRecent={removeFromRecent}
                  onShowInExplorer={handleShowInExplorer}
                  projects={filteredProjects}
                  showDevices={showDevices}
                  showProjects={showProjects}
                />
              ) : (
                <UnifiedListView
                  devices={filteredDevices}
                  onOpenDevice={openDevice}
                  onOpenProject={openRecentProject}
                  onRemoveFromRecent={removeFromRecent}
                  onShowInExplorer={handleShowInExplorer}
                  projects={filteredProjects}
                  showDevices={showDevices}
                  showProjects={showProjects}
                />
              )}
            </>
          )}

          {/* Release Notes Tab */}
          {activeTab === "release-notes" && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText
                className="mb-4"
                size={48}
                style={{color: "var(--color-text-neutral-secondary)"}}
              />
              <h2
                className="mb-2 text-xl font-semibold"
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                Release Notes
              </h2>
              <p style={{color: "var(--color-text-neutral-secondary)"}}>
                Release notes content will be displayed here.
              </p>
            </div>
          )}

          {/* User Guide Tab */}
          {activeTab === "user-guide" && (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen
                className="mb-4"
                size={48}
                style={{color: "var(--color-text-neutral-secondary)"}}
              />
              <h2
                className="mb-2 text-xl font-semibold"
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                User Guide
              </h2>
              <p style={{color: "var(--color-text-neutral-secondary)"}}>
                User guide content will be displayed here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
