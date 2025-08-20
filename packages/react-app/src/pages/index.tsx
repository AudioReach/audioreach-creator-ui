import {type ReactNode, useState} from "react"

import {ApiRequest} from "@audioreach-creator-ui/api-utils"
import {FolderOpen, Loader2} from "lucide-react"

import type {NotificationColor} from "@qui/base"
import {QButton, QCard, useNotification} from "@qui/react"

import {mockBackend} from "~entities/examples/module/api/mock-backend"
import {electronApi} from "~shared/api"

import {useNavigate} from "../router"

export default function StartPage(): ReactNode {
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const {notify} = useNotification()

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

  const handleSelectDirectory = async () => {
    if (!electronApi) {
      console.error("Electron API not available")
      notifyMessage("Electron API not available", "negative")
      return
    }

    try {
      setIsLoading(true)
      console.log("Opening directory picker...")

      // Select directory
      const directoryResponse = await electronApi.send({
        data: {},
        requestType: ApiRequest.SelectDirectory,
      })

      if (directoryResponse.data?.cancelled) {
        notifyMessage("Directory selection cancelled", "informative")
        console.log("Directory selection cancelled")
        return
      }

      const directoryPath = directoryResponse.data?.directoryPath
      if (!directoryPath) {
        notifyMessage("No directory selected", "negative")
        console.error("No directory selected")
        return
      }

      console.log("Loading XML files...")

      // Load XML files from directory
      const xmlResponse = await electronApi.send({
        data: {directoryPath},
        requestType: ApiRequest.LoadXmlsFromDirectory,
      })

      if (!xmlResponse.data?.success) {
        notifyMessage("Failed to load XML files", "negative")
        console.error("Failed to load XML files:", xmlResponse.data?.error)
        return
      }

      const {moduleCount, xmlContents} = xmlResponse.data

      // Initialize mock backend with loaded XML data
      mockBackend.initializeFromXmlContents(xmlContents)

      notifyMessage(`Successfully loaded ${moduleCount} modules`, "positive")

      console.log(`Successfully loaded ${moduleCount} modules`)

      // Navigate to session view
      navigate("/session-view")
    } catch (error) {
      notifyMessage("An error occurred", "negative")
      console.error("Directory selection error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <QCard className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mb-6">
            <FolderOpen className="mx-auto h-16 w-16 text-blue-500" />
          </div>

          <div className="q-font-heading-xl mb-4">AudioReach™ Creator</div>

          <p className="q-font-body-m mb-8">
            Select a directory containing module XML files to get started
          </p>

          <QButton
            className="w-full"
            disabled={isLoading}
            onClick={handleSelectDirectory}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                Select Module Directory
              </>
            )}
          </QButton>
        </div>
      </QCard>
    </div>
  )
}
