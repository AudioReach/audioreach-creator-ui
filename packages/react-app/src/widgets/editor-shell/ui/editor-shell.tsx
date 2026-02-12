/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from "react"

import {useLogView} from "~features/log-view"
import {ConfigFileManager} from "~shared/config/config-manager"
import {ArcSideNav} from "~shared/controls/arc-side-nav"
import {GlobalToaster} from "~shared/controls/global-toaster"
import {
  SideNavProvider,
  useSideNavContext,
} from "~shared/controls/side-nav-provider"
import ProjectLayoutManager from "~shared/layout/project-layout-manager"
import {logger} from "~shared/lib/logger"
import {useKeyboardShortcuts} from "~shared/lib/side-nav"
import {Theme, useTheme} from "~shared/providers/theme-provider"
import {AppTabEntity, useProjectLayoutStore} from "~shared/store"
import {TabGroupType} from "~shared/store/project-layout.types"
import ArcStartPage from "~widgets/start-page/ui/arc-start-page"

const EditorShellContent: React.FC = () => {
  const {keyboardShortcuts} = useSideNavContext()
  const [theme] = useTheme()
  const flexLayoutThemeClass =
    theme === Theme.Dark ? "flexlayout__theme_dark" : "flexlayout__theme_light"

  // Enable keyboard shortcuts for the active tab
  useKeyboardShortcuts(keyboardShortcuts, true)

  return (
    <div
      className={`flex h-screen flex-col ${flexLayoutThemeClass}`}
      style={{backgroundColor: "var(--color-surface-primary)"}}
    >
      <GlobalToaster />
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border-neutral-02)",
          color: "var(--color-text-neutral-primary)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="text-lg font-semibold"
            style={{color: "var(--color-text-neutral-primary)"}}
          >
            AudioReach™ Creator
          </div>
        </div>
      </div>

      <div
        className="relative flex flex-1"
        style={{backgroundColor: "var(--color-surface-primary)"}}
      >
        <div className="relative z-10">
          <ArcSideNav />
        </div>
        <div className="relative z-0 flex-1">
          <ProjectLayoutManager />
        </div>
      </div>
    </div>
  )
}

export const EditorShell: React.FC = () => {
  const store = useProjectLayoutStore()
  const initializedRef = useRef(false)
  const {isLogViewOpen, toggleLogView} = useLogView()

  // Set up IPC listener for log view toggle from menu
  useEffect(() => {
    if (!window.logViewApi) {
      logger.warn("Log View API not available", {
        action: "setup_log_view_listener",
        component: "EditorShell",
      })
      return
    }

    const handleToggleLogView = () => {
      // Determine target state before toggling to avoid race/negation issues
      const targetOpen = !isLogViewOpen()

      // Toggle the log view
      toggleLogView()

      // Update menu state to reflect the actual target state
      window.logViewApi
        .updateLogViewState(targetOpen)
        .catch((error: unknown) => {
          logger.error("Failed to update log view menu state", {
            action: "update_menu_state",
            component: "EditorShell",
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }

    // Register listener
    const cleanup = window.logViewApi.onToggleLogView(handleToggleLogView)

    return cleanup
  }, [toggleLogView, isLogViewOpen])

  // Monitor active tab group and update menu state accordingly
  useEffect(() => {
    if (!window.projectContextApi || !window.logViewApi) {
      return
    }

    const activeTabGroup = store.activeTabGroup

    // Check if we're currently viewing a project tab (not Start page)
    const isViewingProject =
      activeTabGroup?.groupType === TabGroupType.ProjectGroup

    // Update project context in menu
    if (isViewingProject) {
      window.projectContextApi
        .setProjectContext(true)
        .catch((error: unknown) => {
          logger.error("Failed to set project context", {
            action: "set_project_context",
            component: "EditorShell",
            error: error instanceof Error ? error.message : String(error),
          })
        })

      // Update log view menu state based on current project
      const logViewOpen = isLogViewOpen()
      window.logViewApi
        .updateLogViewState(logViewOpen)
        .catch((error: unknown) => {
          logger.error("Failed to update log view state on project change", {
            action: "update_log_view_state",
            component: "EditorShell",
            error: error instanceof Error ? error.message : String(error),
          })
        })
    } else {
      // We're on Start page or no active group - hide menu
      window.projectContextApi
        .setProjectContext(false)
        .catch((error: unknown) => {
          logger.error("Failed to clear project context", {
            action: "clear_project_context",
            component: "EditorShell",
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }
  }, [store.activeTabGroup, isLogViewOpen])

  // Initialize with a default app group and Start tab
  useEffect(() => {
    // Ensure initialization happens only once (important for React 18 Strict Mode)
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    // Check if default app group already exists
    const defaultAppGroup = store.appGroups.find(
      (ag) => ag.id === "default-app-group",
    )

    if (!defaultAppGroup) {
      // Create Start tab
      const startTab = new AppTabEntity("Start", <ArcStartPage />)

      // Clone the component with the actual tab ID
      startTab.component = <ArcStartPage tabId={startTab.id} />

      // Create default app group with Start tab
      store.createAppGroup("default-app-group", "Application", [startTab])
    }
  }, [store])

  // Save configuration on app exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      // beforeunload is synchronous, so we can't reliably await async operations
      // Just trigger the save without waiting
      ConfigFileManager.instance.save().catch((error) => {
        logger.error("Failed to save configuration on exit", {
          action: "save_config_on_exit",
          component: "EditorShell",
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      // Also save on component unmount
      ConfigFileManager.instance.save().catch((error) => {
        logger.error("Failed to save configuration on unmount", {
          action: "save_config_on_unmount",
          component: "EditorShell",
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }, [])

  return (
    <SideNavProvider>
      <EditorShellContent />
    </SideNavProvider>
  )
}
