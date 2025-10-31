import {useMemo, useState} from "react"

import {ApiRequest} from "@audioreach-creator-ui/api-utils"
import {
  Database,
  FilterIcon,
  Folder,
  NotebookTabs,
  Smartphone,
} from "lucide-react"

import type {NotificationColor} from "@qui/base"
import {QButton, QCombobox, QDivider, useNotification} from "@qui/react"

import ArcDeviceList from "~features/device-list/ui/ArcDeviceList"
import useArcRecentProjects from "~features/recent-files/hooks/useArcRecentProjects"
import ArcRecentProjects from "~features/recent-files/ui/ArcRecentProjects"
import {electronApi} from "~shared/api"
import ArcSearchBar from "~shared/controls/ArcSearchBar"
import type ArcDeviceInfo from "~shared/types/arc-device-info"
import type ArcProjectInfo from "~shared/types/arc-project-info"

// todo: this device list should come from the backend. remove this hardcoded list once we get to connected mode tasks
const deviceList: ArcDeviceInfo[] = [
  {
    description: "Qualcomm HS-USB Diagnostic 90DB (COM10)",
    id: "0",
    name: "Device 1",
  },
  {
    description: "127.0.0.1:5558",
    id: "1",
    name: "RaspberryPi 4",
  },
  {
    description: "127.0.0.1:5558",
    id: "2",
    name: "Device 2 TCPIP",
  },
]

export type ArcStartPageProps = {
  /** An event triggered by double-clicking a device card */
  onOpenDeviceProject?: (device: ArcDeviceInfo) => void
  /** An event triggered by double-clicking a project card */
  onOpenWorkspaceProject?: (project: ArcProjectInfo) => void
}

export default function ArcStartPage({
  onOpenDeviceProject,
  onOpenWorkspaceProject,
}: ArcStartPageProps) {
  const [showOnlyProjects, setShowOnlyProjects] = useState(false)
  const [showOnlyDevices, setShowOnlyDevices] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const {
    addToRecent,
    projects: recentProjects,
    removeFromRecent,
  } = useArcRecentProjects()
  const filteredProjects = useMemo(() => {
    if (recentProjects === undefined) {
      return []
    }

    return recentProjects.filter((project: ArcProjectInfo) => {
      return project.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [recentProjects, searchTerm])

  const filteredDevices = useMemo(() => {
    if (deviceList === undefined) {
      return []
    }

    return deviceList.filter((device: ArcDeviceInfo) => {
      return device.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [searchTerm])

  const {notify} = useNotification()

  function handleOpenDeviceProject(device: ArcDeviceInfo) {
    console.log(`Selected a device: ${device.name}`)
    onOpenDeviceProject?.(device)
  }

  const notifyMessage = (
    msg: string,
    msgType: NotificationColor | undefined,
  ): string => {
    notify({
      notification: {
        color: msgType,
        label: <span>{msg}</span>,
      },
    })
    return msg
  }

  function handleOpenRecentWorkspaceProject(project: ArcProjectInfo) {
    console.log(`Selected project: ${project.name}`)

    // Open project in new tab
    onOpenWorkspaceProject?.(project)
  }

  async function handleOpenWorkspaceProject() {
    if (!electronApi) {
      console.error("Electron API not available")
      notifyMessage("Electron API not available", "negative")
      return
    }
    // open file explorer to allow user to load new file

    // call electron api to get filename and path
    try {
      // Open a project file
      const response = await electronApi.send({
        data: null,
        requestType: ApiRequest.OpenProjectFile,
      })

      const openDate = new Date()

      // todo: Modified date should be the time the file was saved
      const project: ArcProjectInfo = {
        description: response.data.project.description,
        filepath: response.data.project.filepath,
        id: openDate.toISOString(), // todo: can be replaced with actual project ID, for now using date + time
        lastModifiedDate: undefined,
        name: response.data.project.name,
      }

      addToRecent(project)

      // Create new tab using project name
      onOpenWorkspaceProject?.(project)
    } catch (error) {
    } finally {
    }
  }

  function handleShowOnlyProjects() {
    setShowOnlyProjects(showOnlyProjects ? false : true)
    setShowOnlyDevices(false)
  }

  function handleShowOnlyDevices() {
    setShowOnlyDevices(showOnlyDevices ? false : true)
    setShowOnlyProjects(false)
  }

  function handleRemoveFromRecent(projectId: string) {
    removeFromRecent(projectId)
  }

  async function handleShowInExplorer(projectId: string) {
    if (!electronApi) {
      console.error("Electron API not available")
      notifyMessage("Electron API not available", "negative")
      return
    }

    const project = recentProjects.find((p) => p.id === projectId)!

    try {
      // Open a project file
      await electronApi.send({
        data: project.filepath,
        requestType: ApiRequest.ShowProjectFileInExplorer,
      })
    } catch (error) {
      console.log(`An error occurred while trying to open the file explorer.`)
      notifyMessage("Failed to open file in explorer", "negative")
    }
  }

  function handleOnFilterOptionChanged(value: string | undefined) {
    console.log(value)
    // filteredProjects = []
    // filteredDevices = []
  }

  return (
    <div className="">
      {/* Top Buttons */}
      <div className="flex flex-row gap-2.5 p-2.5">
        <QButton
          className="rounded-xl"
          size="s"
          startIcon={NotebookTabs}
          variant="outline"
        >
          Release Notes
        </QButton>
        <QButton
          className="rounded-xl"
          size="s"
          startIcon={NotebookTabs}
          variant="outline"
        >
          User Guide
        </QButton>
      </div>

      <QDivider />

      <div className="flex flex-col gap-2.5 p-2.5">
        {/* Search, Open File, and Device Manager */}
        <div className="flex flex-row gap-2.5">
          <h1 className="q-font-heading-sm-subtle content-center">
            Workspaces & Devices
          </h1>
          <ArcSearchBar
            onSearchChange={setSearchTerm}
            searchTerm={searchTerm}
          />
          <QButton
            className="rounded-xl"
            onClick={handleOpenWorkspaceProject}
            startIcon={Folder}
            variant="outline"
          >
            Open File
          </QButton>
          <QButton
            className="rounded-xl"
            startIcon={Smartphone}
            variant="outline"
          >
            Device Manager
          </QButton>
          {/* Hide Grid View and List view for now, but needs to be implemented later */}
          {/* <QButtonGroup>
          <QButton startIcon={LayoutGrid} />
          <QButton startIcon={LayoutList} />
        </QButtonGroup> */}
        </div>

        <div className="flex justify-end gap-2.5">
          <QButton
            className="rounded-xl"
            onClick={handleShowOnlyProjects}
            selected={showOnlyProjects}
            size="s"
            startIcon={Database}
            variant="outline"
          >
            Workspaces
          </QButton>
          <QButton
            className="rounded-xl"
            onClick={handleShowOnlyDevices}
            selected={showOnlyDevices}
            size="s"
            startIcon={Smartphone}
            variant="outline"
          >
            Devices
          </QButton>
          <QCombobox
            className="w-[150px]"
            onChange={(event, value) =>
              handleOnFilterOptionChanged(value?.name)
            }
            optionLabel="name"
            options={[
              {name: "Active"},
              {name: "Inactive"},
              {name: "Diff/Merge"},
            ]}
            placeholder="Filter by..."
            size="s"
            startIcon={FilterIcon}
          >
            Test
          </QCombobox>
        </div>
        {/* Recent Workspace and Device Project Lists */}
        {!showOnlyDevices && (
          <ArcRecentProjects
            onOpenProject={handleOpenRecentWorkspaceProject}
            onRemoveFromRecent={handleRemoveFromRecent}
            onShowInExplorer={handleShowInExplorer}
            projects={filteredProjects}
          />
        )}
        {!showOnlyProjects && (
          <ArcDeviceList
            devices={filteredDevices}
            onOpenDevice={handleOpenDeviceProject}
          />
        )}
      </div>
    </div>
  )
}
