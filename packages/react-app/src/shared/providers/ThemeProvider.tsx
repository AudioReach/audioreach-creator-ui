import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"

import {ConfigFileManager} from "~shared/config/config-manager"
import {logger} from "~shared/lib/logger"

export enum Theme {
  LIGHT = "light",
  DARK = "dark",
}

interface ThemeContextType {
  setTheme: (theme: Theme) => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextType | null>(null)

/**
 * Hook to access and modify the current theme
 * @returns [currentTheme, setTheme] tuple
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return [context.theme, context.setTheme]
}

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider manages the application theme (light/dark mode)
 * - Initializes configuration on mount
 * - Persists theme preference to configuration file
 * - Updates HTML data-theme attribute for Qualcomm UI components
 * - Provides theme state and setter via useTheme hook
 */
export function ThemeProvider({children}: ThemeProviderProps) {
  const [configReady, setConfigReady] = useState(false)
  const [theme, setThemeState] = useState<Theme>(Theme.LIGHT)

  // Initialize configuration and load theme on mount
  useEffect(() => {
    const initConfig = async () => {
      try {
        await ConfigFileManager.instance.initializeConfig()
        // Read theme from config file
        const savedTheme = ConfigFileManager.instance.getGlobalTheme()
        setThemeState(savedTheme === "dark" ? Theme.DARK : Theme.LIGHT)
        setConfigReady(true)
      } catch (error) {
        logger.error("Failed to initialize config in ThemeProvider", {
          action: "initialize_config",
          component: "ThemeProvider",
          error: error instanceof Error ? error.message : String(error),
        })
        // On error, use default theme and continue
        setConfigReady(true)
      }
    }
    void initConfig()
  }, [])

  // Update HTML data-theme attribute when theme changes
  useEffect(() => {
    if (configReady) {
      const html = document.documentElement
      html.setAttribute("data-theme", theme)
    }
  }, [theme, configReady])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    // Save theme to config file
    try {
      ConfigFileManager.instance.setGlobalTheme(newTheme)
      await ConfigFileManager.instance.save()
    } catch (error) {
      logger.error("Failed to save theme to config", {
        action: "save_theme",
        component: "ThemeProvider",
        error: error instanceof Error ? error.message : String(error),
      })
      // revert to previous theme on save failure
      setThemeState(theme)
    }
  }

  // Show loading state while config initializes
  if (!configReady) {
    return (
      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: "100vh",
          justifyContent: "center",
        }}
      >
        <div style={{fontSize: "1.125rem"}}>Loading configuration...</div>
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{setTheme, theme}}>
      {children}
    </ThemeContext.Provider>
  )
}
