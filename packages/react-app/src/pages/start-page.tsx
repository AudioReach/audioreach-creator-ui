import {type ReactNode, useCallback, useEffect, useState} from "react"

import {Loader2} from "lucide-react"

import type {NotificationColor} from "@qui/base"
import {QCard, useNotification} from "@qui/react"

import {useProjectStore} from "~entities/project"

import {useNavigate} from "../router"

export default function StartPage(): ReactNode {
  const {backendUnavailable, error, fetchProjects, isLoading, projects} =
    useProjectStore()
  const navigate = useNavigate()
  const {notify} = useNotification()
  const [errorNotified, setErrorNotified] = useState(false)

  // Fetch projects when the component mounts
  useEffect(() => {
    console.log("[StartPage] Component mounted, fetching projects")
    void fetchProjects()
  }, [fetchProjects])

  const notifyMessage = useCallback(
    (msg: string, msgType: NotificationColor | undefined): string => {
      notify({
        notification: {
          color: msgType,
          label: <span>{msg}</span>,
        },
      })
      return msg
    },
    [notify],
  )

  // Handle project selection
  const handleOpenProject = async (projectId: string) => {
    console.log(`[StartPage] Opening project: ${projectId}`)
    try {
      const success = await useProjectStore.getState().openProject(projectId)
      if (success) {
        console.log(
          `[StartPage] Project opened successfully, navigating to session view`,
        )
        void notifyMessage(`Project opened successfully`, "positive")
        void navigate("/session-view")
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error(`[StartPage] Error opening project: ${errorMessage}`)
      notifyMessage(`Failed to open project: ${errorMessage}`, "negative")
    }
  }

  // Display error if there is one, but only once
  useEffect(() => {
    if (error && !errorNotified) {
      console.error(`[StartPage] Error received: ${error}`)
      void notifyMessage(error, "negative")
      setErrorNotified(true)
    }
  }, [error, errorNotified, notifyMessage])

  return (
    <div className="h-screen w-full flex-col p-8">
      <div className="mb-8 text-center">
        <div className="q-font-heading-xl mb-4">AudioReach™ Creator</div>
        <p className="q-font-body-m">
          {backendUnavailable
            ? "Backend service is unavailable. Please ensure it's running at localhost:3500."
            : "Select a project to open"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : backendUnavailable ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="py-8 text-center text-gray-500">
            <p className="mb-4">Backend service is unavailable.</p>
            <p>
              Please ensure the backend service is running at localhost:3500.
            </p>
            <button
              className="mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => {
                setErrorNotified(false)
                void fetchProjects()
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <QCard
                key={project.projectId}
                className="cursor-pointer p-4 transition-shadow hover:shadow-lg"
                onClick={() => void handleOpenProject(project.projectId)}
              >
                <div className="q-font-heading-m mb-2">{project.name}</div>
                <p className="q-font-body-s text-gray-600">
                  {project.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {project.projectType}
                  </span>
                  <span className="text-xs text-gray-500">
                    {project.sessionMode}
                  </span>
                </div>
              </QCard>
            ))
          ) : (
            <div className="col-span-3 py-8 text-center text-gray-500">
              No projects available. Please create a project first.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
