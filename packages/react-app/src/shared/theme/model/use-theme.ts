import {useCallback, useState} from "react"

export type ThemeMode = "dark" | "light"

interface UseTheme {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

export function useTheme(): UseTheme {
  const [mode, setMode] = useState<ThemeMode>("light")

  const toggleMode = useCallback(() => {
    if (typeof window === "undefined") {
      console.warn("Theme toggling can only be performed on the client")
      return
    }

    const html = document.getElementById("html")
    if (!html) {
      console.warn("Error, expecting HTML element but it was not found")
      return
    }
    setMode((prevState) => {
      if (prevState === "dark") {
        html.classList.remove("dark")
        html.classList.add("light")
        return "light"
      } else {
        html.classList.remove("light")
        html.classList.add("dark")
        return "dark"
      }
    })
  }, [])

  return {mode, setMode, toggleMode}
}
