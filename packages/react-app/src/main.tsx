import {useEffect} from "react"

import {createRoot} from "react-dom/client"

import {QuiRoot} from "@qui/react"

import {ensureRegistered} from "~shared/api/register-client"
import {logger} from "~shared/lib/logger"
import {EditorShell} from "~widgets/editor-shell"

import "./index.css"

const App = () => {
  useEffect(() => {
    ensureRegistered().catch((error) => {
      logger.error(`Failed to register client: ${error}`)
    })
  }, [])

  return (
    <QuiRoot>
      <EditorShell />
    </QuiRoot>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
