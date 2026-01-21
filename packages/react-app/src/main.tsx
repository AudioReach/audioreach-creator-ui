import {createRoot} from "react-dom/client"

import {ThemeProvider} from "~shared/providers/ThemeProvider"
import {EditorShell} from "~widgets/editor-shell"

import "./index.css"

const App = () => {
  // useEffect(() => {
  //   ensureRegistered().catch((error) => {
  //     logger.error(`Failed to register client: ${error}`)
  //   })
  // }, [])

  return (
    <ThemeProvider>
      <EditorShell />
    </ThemeProvider>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
