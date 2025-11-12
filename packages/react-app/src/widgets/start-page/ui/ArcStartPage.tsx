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

import {
  openProject,
  openWorkspaceProject,
} from "~entities/project/api/projectsApi"
import ArcDeviceList from "~features/device-list/ui/ArcDeviceList"
import useArcRecentProjects from "~features/recent-files/hooks/useArcRecentProjects"
import ArcRecentProjects from "~features/recent-files/ui/ArcRecentProjects"
import {electronApi} from "~shared/api"
import ArcSearchBar from "~shared/controls/ArcSearchBar"
import {useApplicationStore} from "~shared/store"
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
  const createProjectGroup = useApplicationStore(
    (state) => state.createProjectGroup,
  )
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

  /**
   * Common logic to handle successful project opening
   * Called by both handleOpenWorkspaceProject and handleOpenRecentWorkspaceProject
   */
  const handleProjectOpenSuccess = (project: ArcProjectInfo) => {
    // Add to recent projects
    addToRecent(project)

    // Create project group in the store
    // This automatically sets it as active, creates tabs, and manages accordion behavior
    createProjectGroup(
      project.filepath,
      project.name,
      project.id,
      undefined, // onClose callback (optional)
    )

    // Notify parent component to open the project
    onOpenWorkspaceProject?.(project)

    notifyMessage("Project opened successfully", "positive")
  }

  async function handleOpenRecentWorkspaceProject(project: ArcProjectInfo) {
    console.log(`Selected project: ${project.name}`)

    try {
      // Call backend API to open/connect to the project
      const result = await openProject(project.id)

      if (result.success) {
        // Use common handler
        handleProjectOpenSuccess(project)
      } else {
        notifyMessage(result.message || "Failed to open project", "negative")
      }
    } catch (error) {
      console.error("Error opening recent project:", error)
      notifyMessage("Failed to open project", "negative")
    }
  }

  async function handleOpenWorkspaceProject() {
    if (!electronApi) {
      console.error("Electron API not available")
      notifyMessage("Electron API not available", "negative")
      return
    }

    try {
      // Open a project file using Electron API
      const response = await electronApi.send({
        data: null,
        requestType: ApiRequest.OpenProjectFile,
      })

      // Check if user cancelled the file selection
      if (response.data.cancelled || !response.data.project) {
        console.log("File selection cancelled")
        return
      }

      const projectInfo = response.data.project
      const workspaceFileData = response.data.workspaceFileData
      const acdbFileData = response.data.acdbFileData

      // Validate that we have the required binary data
      if (!workspaceFileData) {
        notifyMessage("Failed to read workspace file data", "negative")
        return
      }

      if (!acdbFileData) {
        notifyMessage(
          "No .acdb file found in the project directory",
          "negative",
        )
        return
      }

      // Convert Buffer data to File objects
      const workspaceFileName =
        projectInfo.filepath.split(/[\\/]/).pop() || "workspace.awsp"
      const workspaceFile = new File(
        [new Uint8Array(workspaceFileData)],
        workspaceFileName,
        {type: "application/octet-stream"},
      )

      // For acdb file, we don't have the exact filename from the response,
      // but we know it's a .acdb file
      const acdbFile = new File(
        [new Uint8Array(acdbFileData)],
        "project.acdb",
        {type: "application/octet-stream"},
      )

      // Call the backend API to upload and open the project
      const result = await openWorkspaceProject(
        acdbFile,
        workspaceFile,
        projectInfo.name,
        projectInfo.description,
      )

      if (result.success && result.data) {
        const desc = result.data.description
          ? result.data.description
          : projectInfo.description
        const name =
          result.data.name !== undefined ? result.data.name : projectInfo.name
        // Create project info for recent projects list
        const project: ArcProjectInfo = {
          description: desc,
          filepath: projectInfo.filepath,
          id: result.data.projectId,
          lastModifiedDate: new Date(),
          name,
        }

        // Use common handler
        handleProjectOpenSuccess(project)
      } else {
        notifyMessage(result.message || "Failed to open project", "negative")
      }
    } catch (error) {
      console.error("Error opening workspace project:", error)
      notifyMessage("Failed to open workspace project", "negative")
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
