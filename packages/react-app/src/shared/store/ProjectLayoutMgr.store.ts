import type {ReactNode} from "react"

import {create} from "zustand"

import {
  type AppGroupInterface,
  type ApplicationConfig,
  type AppTabInterface,
  type OnGroupClose,
  type OnProjectClose,
  type OnTabClose,
  PanelID,
  type PanelTabInterface,
  type ProjectBaseTabInterface,
  type ProjectGroupInterface,
  type ProjectLayoutStoreInterface,
  type ProjectMainTabInterface,
  type ProjectTabInterface,
  type ProjectTabLayout,
  type TabGroupInterface,
  TabGroupType,
  TabType,
} from "./ProjectLayoutMgr.interface"

// Configuration constants
const APP_CONFIG: ApplicationConfig = {
  AUTO_COLLAPSE_ON_NEW_PROJECT: true, // Enable auto-collapse for accordion behavior
  DEFAULT_PROJECT_NAME_PATTERN: (filename: string) => {
    const name = filename.split(/[/\\]/).pop() || filename
    return name.replace(/\.(xml|json|acdb)$/i, "")
  },
  MAX_PROJECT_GROUPS: 50,
  STORAGE_VERSION: "1.0",
}

// Centralized ID generation function
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Represents app tabs like Welcome, Settings that persist across all projects
export class AppTab implements AppTabInterface {
  component: ReactNode
  id: string
  onAppClose?: OnTabClose | undefined
  onTabClose?: OnTabClose | undefined
  tabType: TabType
  title: string

  constructor(
    title: string,
    component: ReactNode,
    onTabCloseCB?: OnTabClose,
    onAppCloseCB?: OnTabClose,
  ) {
    this.id = generateId("app-tab")
    this.tabType = TabType.AppTab
    this.title = title
    this.component = component
    this.onTabClose = onTabCloseCB
    this.onAppClose = onAppCloseCB
  }
}

// Represents the main tab of a project group that contains panel layouts
export class ProjectMainTab implements ProjectMainTabInterface {
  id: string
  onTabClose?: OnTabClose | undefined
  panelLayout: ProjectTabLayout
  tabType: TabType
  title: string

  constructor(
    title: string,
    panelLayout: ProjectTabLayout,
    onTabClose?: OnTabClose,
  ) {
    this.id = generateId("project-main")
    this.tabType = TabType.ProjectMainTab
    this.title = title
    this.panelLayout = panelLayout
    this.onTabClose = onTabClose
  }
}

// Represents additional tabs within a project group with panel layouts
export class ProjectTab implements ProjectTabInterface {
  component?: ReactNode | undefined
  id: string
  onProjectClose?: OnProjectClose | undefined
  onTabClose?: OnTabClose | undefined
  panelLayout?: ProjectTabLayout | undefined
  tabType: TabType
  title: string

  constructor(
    title: string,
    panelLayoutOrComponent?: ProjectTabLayout | ReactNode,
    onTabClose?: OnTabClose,
    onProjectClose?: OnProjectClose,
  ) {
    this.id = generateId("project-tab")
    this.tabType = TabType.ProjectTab
    this.title = title
    this.onTabClose = onTabClose
    this.onProjectClose = onProjectClose

    if (
      panelLayoutOrComponent &&
      typeof panelLayoutOrComponent === "object" &&
      "flexLayoutData" in panelLayoutOrComponent
    ) {
      this.panelLayout = panelLayoutOrComponent as ProjectTabLayout
      this.component = undefined
    } else {
      this.component = panelLayoutOrComponent as ReactNode
      this.panelLayout = undefined
    }
  }
}

// Represents individual panel tabs like Properties, Console within project layouts
export class PanelTab implements PanelTabInterface {
  component: ReactNode
  id: string
  onProjectClose?: OnProjectClose | undefined
  onTabClose?: OnTabClose | undefined
  title: string

  constructor(
    title: string,
    component: ReactNode,
    onTabClose?: OnTabClose,
    onProjectClose?: OnProjectClose,
  ) {
    this.id = generateId("panel-tab")
    this.title = title
    this.component = component
    this.onTabClose = onTabClose
    this.onProjectClose = onProjectClose
  }
}

// Main Zustand store that manages all tab groups, layouts, and UI state
export const useProjectLayoutStore = create<ProjectLayoutStoreInterface>(
  (set, get) => ({
    activeTab: null,
    activeTabGroup: null,
    // Adds app tab to existing application group
    addAppTab: (appGroupID: string, appTab: AppTab): boolean => {
      let found = false
      set((state) => {
        const updatedAppGroups = state.appGroups.map((appGroup) => {
          if (appGroup.id === appGroupID) {
            found = true
            return {
              ...appGroup,
              // Don't automatically set as active - let the caller decide
              appTabs: [...appGroup.appTabs, appTab],
            }
          } else {
            return appGroup
          }
        })
        return {appGroups: updatedAppGroups}
      })
      return found
    },
    // Adds a panel tab to specific position in project tab layout
    addPanelTab: (
      tabId: string,
      panelId: PanelID,
      panelTab: PanelTab,
    ): boolean => {
      const state = get()
      const layout = state.projectTabLayouts.get(tabId)

      if (!layout || !layout.flexLayoutData) {
        console.warn(`Layout not found for tab ${tabId}`)
        return false
      }

      const flexData = JSON.parse(JSON.stringify(layout.flexLayoutData))

      // Create new tab definition for FlexLayout JSON
      const newTab = {
        component: "panel-tab",
        id: panelTab.id,
        name: panelTab.title,
        type: "tab",
      }

      let updated = false

      if (panelId === PanelID.CenterPanel) {
        // Add to center panel
        if (flexData.layout && flexData.layout.children) {
          // Find existing center tabset or create one
          let centerTabset = flexData.layout.children.find(
            (child: any) => child.type === "tabset",
          )
          if (!centerTabset) {
            // Create center tabset if it doesn't exist
            centerTabset = {
              children: [],
              enableTabStrip: true,
              type: "tabset",
            }
            flexData.layout.children.push(centerTabset)
          }

          if (centerTabset.children) {
            centerTabset.children.push(newTab)
            updated = true
          }
        }
      } else {
        // Add to border panels
        const locationMap = {
          [PanelID.BottomPanel]: "bottom",
          [PanelID.LeftPanel]: "left",
          [PanelID.RightPanel]: "right",
          [PanelID.TopPanel]: "top",
        }

        const targetLocation = locationMap[panelId]

        if (targetLocation) {
          // Ensure borders array exists
          if (!flexData.borders) {
            flexData.borders = []
          }

          // Find existing border or create new one
          let border = flexData.borders.find(
            (b: any) => b.location === targetLocation,
          )

          if (!border) {
            // Create new border
            border = {
              children: [],
              location: targetLocation,
              size:
                targetLocation === "top" || targetLocation === "bottom"
                  ? 150
                  : 200,
              type: "border",
            }
            flexData.borders.push(border)
          }

          // Add tab to border
          if (border.children) {
            border.children.push(newTab)
            updated = true
          }
        }
      }

      if (updated) {
        // Update both FlexLayout JSON and component registry
        set((state) => {
          const newLayouts = new Map(state.projectTabLayouts)
          const updatedLayout: ProjectTabLayout = {
            flexLayoutData: flexData,
          }
          newLayouts.set(tabId, updatedLayout)

          // Store both React component and full PanelTab object
          const newComponentRegistry = new Map(state.componentRegistry)
          newComponentRegistry.set(panelTab.id, panelTab.component)

          // Store full PanelTab object for callback access
          const newPanelTabRegistry = new Map(
            state.panelTabRegistry || new Map(),
          )
          newPanelTabRegistry.set(panelTab.id, panelTab)

          return {
            componentRegistry: newComponentRegistry,
            panelTabRegistry: newPanelTabRegistry,
            projectTabLayouts: newLayouts,
          }
        })
        return true
      }

      console.warn(
        `Failed to add panel tab "${panelTab.title}" to ${Object.keys(PanelID)[panelId]}`,
      )
      return false
    },
    // Adds project tab to existing project group
    addTabToProjectGroup: (
      projectGroupId: string,
      tab: ProjectTab,
    ): boolean => {
      let found = false
      set((state) => {
        const updatedProjectGroups = state.projectGroups.map((projectGroup) => {
          if (projectGroup.id === projectGroupId) {
            found = true
            return {
              ...projectGroup,
              projectTabs: [...projectGroup.projectTabs, tab],
            }
          } else {
            return projectGroup
          }
        })

        //Update tabGroups Map to keep it synchronized
        const updatedTabGroups = new Map(state.tabGroups)
        const updatedProjectGroup = updatedProjectGroups.find(
          (p) => p.id === projectGroupId,
        )
        if (updatedProjectGroup) {
          updatedTabGroups.set(projectGroupId, updatedProjectGroup)
        }

        return {
          projectGroups: updatedProjectGroups,
          tabGroups: updatedTabGroups,
        }
      })
      return found
    },
    appGroups: [],
    // Closes app tab with group destruction handling
    closeAppTab: (appTabID: string): void => {
      const state = get()

      // Find the app group containing this tab
      const targetGroup = state.appGroups.find((group) =>
        group.appTabs.some((tab) => tab.id === appTabID),
      )

      if (!targetGroup) {
        console.warn(`App tab with id ${appTabID} not found in any group`)
        return
      }

      // Check if this is the last tab in the group
      if (targetGroup.appTabs.length === 1) {
        // Last tab - trigger group destruction with confirmation
        if (targetGroup.onClose) {
          const shouldClose = targetGroup.onClose(
            targetGroup.id,
            targetGroup.title,
          )

          // Handle async confirmation
          if (shouldClose instanceof Promise) {
            shouldClose
              .then((confirmed) => {
                if (confirmed) {
                  state.removeAppGroup(targetGroup.id)
                }
              })
              .catch((error) => {
                console.error("Error in app group close callback:", error)
              })
            return
          } else {
            if (!shouldClose) {
              return // User cancelled, keep the tab
            }
          }
        }

        // Proceed with group destruction
        state.removeAppGroup(targetGroup.id)
      } else {
        // Multiple tabs - safe to close individual tab
        set((state) => {
          const updatedAppGroups = state.appGroups.map((appGroup) => {
            if (appGroup.id === targetGroup.id) {
              const updatedTabs = appGroup.appTabs.filter(
                (tab) => tab.id !== appTabID,
              )

              // Update active tab if we're closing the active one
              let newActiveTabId = appGroup.activeTabId

              if (appGroup.activeTabId === appTabID) {
                // We're closing the active tab, set new active tab to first remaining tab
                newActiveTabId =
                  updatedTabs.length > 0 ? updatedTabs[0].id : null
              }

              return {
                ...appGroup,
                activeTabId: newActiveTabId,
                appTabs: updatedTabs,
              }
            }
            return appGroup
          })

          // Update tabGroups map
          const updatedTabGroups = new Map(state.tabGroups)
          const updatedGroup = updatedAppGroups.find(
            (ag) => ag.id === targetGroup.id,
          )
          if (updatedGroup) {
            updatedTabGroups.set(targetGroup.id, updatedGroup)
          }

          // Update global active tab if we closed the currently active tab
          let newGlobalActiveTab = state.activeTab
          if (state.activeTab?.id === appTabID) {
            const updatedGroup = updatedAppGroups.find(
              (ag) => ag.id === targetGroup.id,
            )
            if (updatedGroup && updatedGroup.activeTabId) {
              newGlobalActiveTab =
                updatedGroup.appTabs.find(
                  (tab) => tab.id === updatedGroup.activeTabId,
                ) || null
            }
          }

          return {
            activeTab: newGlobalActiveTab,
            appGroups: updatedAppGroups,
            tabGroups: updatedTabGroups,
          }
        })
      }
    },
    componentRegistry: new Map(), // Map<panelTabId, ReactNode>
    // Creates new application group
    createAppGroup: (
      Id: string,
      title: string,
      initialTabs: AppTabInterface[],
      onClose?: OnGroupClose,
    ): boolean => {
      const state = get()

      // Validate minimum 1 tab requirement
      if (!initialTabs || initialTabs.length === 0) {
        console.error(
          "Cannot create app group with 0 tabs. Minimum 1 required.",
        )
        return false
      }

      if (!state.appGroups.find((ag) => ag.id === Id)) {
        const appGroupName = title || Id

        // Assign permanent color ID and increment for next group
        const assignedColorId = state.nextColorId
        const nextColorId = (assignedColorId % 20) + 1 // Cycle through 1-20

        const newAppGroup: AppGroupInterface = {
          activeTabId: initialTabs[0].id, // Set first tab as active
          appTabs: [...initialTabs], // Use the provided tabs array
          colorId: assignedColorId, // Permanent color assignment
          groupType: TabGroupType.AppGroup,
          id: Id,
          isCollapsed: false,
          onClose, // Store the callback with the group
          title: appGroupName,
        }
        set((state) => {
          const updatedAppGroups = [...state.appGroups, newAppGroup]
          const updatedTabGroups = new Map(state.tabGroups)
          updatedTabGroups.set(Id, newAppGroup)
          const newState = {
            appGroups: updatedAppGroups,
            nextColorId, // Update next available color ID
            tabGroups: updatedTabGroups,
          }
          return newState
        })
        setTimeout(() => {
          const currentState = get()
          currentState.expandTabGroup(Id)
        }, 0)
        return true
      } else {
        return false
      }
    },
    // Creates layout configuration from JSON string
    createLayoutConfigFromJSON: (
      projectGroupId: string,
      layoutConfigJSON: string,
    ): boolean => {
      try {
        const layoutConfig = JSON.parse(layoutConfigJSON)
        const newLayout: ProjectTabLayout = {
          flexLayoutData: layoutConfig,
        }

        set((state) => {
          const newLayouts = new Map(state.projectTabLayouts)
          newLayouts.set(projectGroupId, newLayout)
          return {projectTabLayouts: newLayouts}
        })
        return true
      } catch (error) {
        console.error("Failed to create layout config from JSON:", error)
        return false
      }
    },
    // Creates new project group
    createProjectGroup: (
      Id: string,
      projectKey: string,
      title: string,
      mainTab: ProjectMainTab,
      description?: string,
      onClose?: OnGroupClose,
    ): boolean => {
      const state = get()

      if (state.projectGroups.length < APP_CONFIG.MAX_PROJECT_GROUPS) {
        // Check if project group already exists
        const existingProjectGroup = state.isProjectGroupAlreadyOpen(projectKey)
        if (existingProjectGroup) {
          // Switch to existing project group instead of creating new one
          state.switchToProjectGroup(existingProjectGroup.id)
          return true
        }
        const projectGroupName =
          APP_CONFIG.DEFAULT_PROJECT_NAME_PATTERN(title) || Id

        // Determine if this is the first project group
        const isFirstGroup = state.projectGroups.length === 0

        // Assign permanent color ID and increment for next group
        const assignedColorId = state.nextColorId
        const nextColorId = (assignedColorId % 20) + 1 // Cycle through 1-20

        // Each group has its own callback, not a global one
        const newProjectGroup: ProjectGroupInterface = {
          activeTabId: null,
          colorId: assignedColorId, // Permanent color assignment
          description: description || null,
          groupType: TabGroupType.ProjectGroup,
          id: Id,
          isCollapsed: false,
          mainTab,
          onClose, // Store the callback with the group
          projectKey,
          projectTabs: [],
          title: projectGroupName,
        }
        set((state) => {
          let updatedProjectGroups = [...state.projectGroups, newProjectGroup]
          // If this is the second project group and auto-collapse is enabled, collapse the first one
          if (
            updatedProjectGroups.length > 1 &&
            APP_CONFIG.AUTO_COLLAPSE_ON_NEW_PROJECT
          ) {
            updatedProjectGroups = updatedProjectGroups.map((projectGroup) => {
              if (projectGroup.id !== Id) {
                return {...projectGroup, isCollapsed: true}
              }
              return projectGroup
            })
          }

          // Collapse all app groups when opening a new project
          const updatedAppGroups = state.appGroups.map((appGroup) => ({
            ...appGroup,
            isCollapsed: true,
          }))

          // For accordion behavior: always set new group as active
          const updatedTabGroups = new Map(state.tabGroups)
          updatedTabGroups.set(Id, newProjectGroup)

          // Update tabGroups map with collapsed app groups
          updatedAppGroups.forEach((appGroup) => {
            updatedTabGroups.set(appGroup.id, appGroup)
          })

          const newState = {
            activeTab: mainTab, // Set the main tab as the active tab
            activeTabGroup: newProjectGroup, // Always set new group as active
            appGroups: updatedAppGroups, // Update app groups with collapsed state
            nextColorId, // Update next available color ID
            previousActiveProjectGroupId: state.activeTabGroup?.id,
            projectGroups: updatedProjectGroups,
            tabGroups: updatedTabGroups,
          }
          return newState
        })
        // If this is the first group, automatically expand it using accordion behavior
        // This ensures the first group is always visible and active
        if (isFirstGroup) {
          const currentState = get()
          currentState.expandTabGroup(Id)
        }
        return true
      } else {
        return false
      }
    },
    // Accordion behavior - expand one group and collapse all others (Fixed based on working reference)
    expandTabGroup: (groupId: string): void => {
      set((state) => {
        const clickedGroup = state.tabGroups.get(groupId)

        if (!clickedGroup) {
          return state
        }

        const isCurrentlyCollapsed = clickedGroup.isCollapsed

        // Check if clicking on already active and expanded group - prevent refresh
        // BUT allow accordion behavior if there are other groups that need collapsing
        const hasOtherGroups = state.tabGroups.size > 1
        if (
          state.activeTabGroup?.id === groupId &&
          !isCurrentlyCollapsed &&
          !hasOtherGroups
        ) {
          return state
        }

        let newActiveTab = state.activeTab
        let updatedClickedGroup = clickedGroup

        // Handle both App Groups and Project Groups
        if (clickedGroup.groupType === TabGroupType.AppGroup) {
          const appGroup = clickedGroup as AppGroupInterface

          // For App Groups, determine which tab should be active
          if (appGroup.activeTabId) {
            // Check if activeTabId is one of the app tabs
            const foundAppTab = appGroup.appTabs.find(
              (t) => t.id === appGroup.activeTabId,
            )
            if (foundAppTab) {
              newActiveTab = foundAppTab
            } else {
              // Fallback to first tab if activeTabId doesn't match any tab
              const newActiveTabId = appGroup.appTabs[0].id
              updatedClickedGroup = {...appGroup, activeTabId: newActiveTabId}
              newActiveTab = appGroup.appTabs[0]
            }
          } else {
            // No activeTabId set, default to first tab
            const newActiveTabId = appGroup.appTabs[0].id
            updatedClickedGroup = {...appGroup, activeTabId: newActiveTabId}
            newActiveTab = appGroup.appTabs[0]
          }
        } else if (clickedGroup.groupType === TabGroupType.ProjectGroup) {
          const projGroup = clickedGroup as ProjectGroupInterface

          // Always set active tab when switching to this group (whether collapsed or not)
          if (projGroup.activeTabId) {
            // Check if stored activeTabId is the main tab
            if (projGroup.activeTabId === projGroup.mainTab.id) {
              newActiveTab = projGroup.mainTab
            } else {
              // Check if stored activeTabId exists in project tabs
              const storedProjectTab = projGroup.projectTabs.find(
                (t) => t.id === projGroup.activeTabId,
              )
              if (storedProjectTab) {
                newActiveTab = storedProjectTab
              } else {
                // Stored tab doesn't exist, fallback to main tab
                const newActiveTabId = projGroup.mainTab.id
                updatedClickedGroup = {
                  ...projGroup,
                  activeTabId: newActiveTabId,
                }
                newActiveTab = projGroup.mainTab
              }
            }
          } else {
            // No activeTabId stored, default to main tab
            const newActiveTabId = projGroup.mainTab.id
            updatedClickedGroup = {...projGroup, activeTabId: newActiveTabId}
            newActiveTab = projGroup.mainTab
          }
        }

        // Update all project groups - expand clicked, collapse others
        const updatedProjectGroups = state.projectGroups.map((projectGroup) => {
          if (projectGroup.id === groupId) {
            return {
              ...updatedClickedGroup,
              isCollapsed: false,
            } as ProjectGroupInterface
          }
          return {
            ...projectGroup,
            isCollapsed: true,
          }
        })

        // Update all app groups - expand clicked, collapse others
        const updatedAppGroups = state.appGroups.map((appGroup) => {
          if (appGroup.id === groupId) {
            return {
              ...updatedClickedGroup,
              isCollapsed: false,
            } as AppGroupInterface
          }
          return {
            ...appGroup,
            isCollapsed: true,
          }
        })

        // Update tabGroups map - collapse ALL other groups (both app and project)
        const updatedTabGroups = new Map(state.tabGroups)

        // Create new map with updated collapse states
        const finalTabGroups = new Map<string, TabGroupInterface>()
        updatedTabGroups.forEach((tabGroup, key) => {
          if (tabGroup.id !== groupId) {
            finalTabGroups.set(key, {...tabGroup, isCollapsed: true})
          } else {
            finalTabGroups.set(key, {...tabGroup, isCollapsed: false})
          }
        })

        const newState = {
          activeTab: newActiveTab, // Set appropriate active tab
          activeTabGroup: updatedClickedGroup, // Always set clicked group as active
          appGroups: updatedAppGroups,
          previousActiveProjectGroupId: state.activeTabGroup?.id, // Track previous
          projectGroups: updatedProjectGroups,
          tabGroups: finalTabGroups,
        }

        return newState
      })
    },

    // Gets currently active project group
    getActiveProjectGroup: (): ProjectGroupInterface | null => {
      const state = get()
      return (
        state.projectGroups.find(
          (projectGroup) => projectGroup.id === state.activeTabGroup?.id,
        ) || null
      )
    },

    // Gets currently active project or app tab
    getActiveProjectTab: ():
      | AppTabInterface
      | ProjectBaseTabInterface
      | null => {
      const state = get()
      if (!state.activeTab) {
        return null
      }

      // Check if it's an app tab
      for (const appGroup of state.appGroups) {
        const appTab = appGroup.appTabs.find(
          (tab) => tab.id === state.activeTab?.id,
        )
        if (appTab) {
          return appTab
        }
      }

      // Check if it's a project tab
      for (const projectGroup of state.projectGroups) {
        if (projectGroup.mainTab.id === state.activeTab?.id) {
          return projectGroup.mainTab
        }
        const projectTab = projectGroup.projectTabs.find(
          (tab) => tab.id === state.activeTab?.id,
        )
        if (projectTab) {
          return projectTab
        }
      }

      return null
    },

    // Gets project tab layout by tab ID
    getLayout: (tabId: string): ProjectTabLayout | null => {
      const state = get()
      return state.projectTabLayouts.get(tabId) || null
    },

    // Gets FlexLayout configuration as JSON string
    getLayoutConfig: (projectGroupId: string): string | null => {
      const state = get()
      const layout = state.projectTabLayouts.get(projectGroupId)
      return layout?.flexLayoutData
        ? JSON.stringify(layout.flexLayoutData)
        : null
    },

    //Finds and returns a specific ProjectGroup by its ID from the projectGroups array
    getProjectGroupById: (
      projectGroupId: string,
    ): ProjectGroupInterface | null => {
      const state = get()
      return (
        state.projectGroups.find(
          (projectGroup) => projectGroup.id === projectGroupId,
        ) || null
      )
    },

    // Dynamic tab visibility
    getVisibleTabs: () => {
      const state = get()
      const visibleTabs: (
        | AppTabInterface
        | ProjectGroupInterface
        | ProjectBaseTabInterface
        | ProjectTabInterface
      )[] = []

      // Always show app tabs (all tabs in the array)
      state.appGroups.forEach((appGroup) => {
        visibleTabs.push(...appGroup.appTabs)
      })
      // Show project tabs based on collapse state
      state.projectGroups.forEach((projectGroup) => {
        if (projectGroup.isCollapsed) {
          visibleTabs.push(projectGroup)
        } else {
          visibleTabs.push(projectGroup.mainTab)
          visibleTabs.push(...projectGroup.projectTabs)
        }
      })

      return visibleTabs
    },

    // App lifecycle
    initializeApp: (): void => {
      // App initialization logic can be added here if needed
    },

    // Checks if app tab with given key is open
    isAppTabOpen: (tabKey: string): boolean => {
      const state = get()
      return state.appGroups.some((appGroup) =>
        appGroup.appTabs.some((tab) => tab.id === tabKey),
      )
    },

    // Checks if project group with given key is already open
    isProjectGroupAlreadyOpen: (
      projectKey: string,
    ): ProjectGroupInterface | null => {
      const state = get()
      return (
        state.projectGroups.find(
          (projectGroup) => projectGroup.projectKey === projectKey,
        ) || null
      )
    },

    nextColorId: 1, // Track next available color ID (1-20, cycles)

    panelTabRegistry: new Map(), // Map<panelTabId, PanelTab>

    previousActiveProjectGroupId: null,

    projectGroups: [],

    projectTabLayouts: new Map(), // Map<projectGroupId, ProjectTabLayout>
    // Removes app group from store
    removeAppGroup: (appGroupId: string): void => {
      set((state) => {
        const updatedAppGroups = state.appGroups.filter(
          (appGroup) => appGroup.id !== appGroupId,
        )

        // Update tabGroups map
        const updatedTabGroups = new Map(state.tabGroups)
        updatedTabGroups.delete(appGroupId)

        let newActiveTabGroup: TabGroupInterface | null = null
        let newActiveTab = state.activeTab

        // If we removed the active app group, switch to another group
        if (state.activeTabGroup?.id === appGroupId) {
          if (updatedAppGroups.length > 0) {
            // Switch to first remaining app group
            newActiveTabGroup = updatedAppGroups[0]
            newActiveTab = updatedAppGroups[0].appTabs[0] // Use first tab in array
          } else if (state.projectGroups.length > 0) {
            // Switch to first project group if no app groups remain
            // Expand the first project group (fix for asymmetric behavior)
            const updatedProjectGroups = state.projectGroups.map(
              (projectGroup, index) => ({
                ...projectGroup,
                isCollapsed: index !== 0, // Expand first project group, collapse others
              }),
            )

            let firstProject = updatedProjectGroups[0]
            newActiveTabGroup = firstProject

            // Set active tab in the expanded group
            if (firstProject.projectTabs.length > 0) {
              // Use group's active tab or first project tab
              const targetTabId =
                firstProject.activeTabId &&
                firstProject.projectTabs.find(
                  (t) => t.id === firstProject.activeTabId,
                )
                  ? firstProject.activeTabId
                  : firstProject.projectTabs[0].id

              newActiveTab =
                firstProject.projectTabs.find((t) => t.id === targetTabId) ||
                null
              firstProject = {...firstProject, activeTabId: targetTabId}
            } else {
              // Use main tab
              newActiveTab = firstProject.mainTab
              firstProject = {
                ...firstProject,
                activeTabId: firstProject.mainTab.id,
              }
            }

            // Update tabGroups map with expanded project group
            updatedTabGroups.set(firstProject.id, firstProject)

            // Return updated project groups with the modified first project
            const finalProjectGroups = updatedProjectGroups.map((pg, index) =>
              index === 0 ? firstProject : pg,
            )

            // Return updated project groups
            return {
              activeTab: newActiveTab,
              activeTabGroup: newActiveTabGroup,
              appGroups: updatedAppGroups,
              projectGroups: finalProjectGroups,
              tabGroups: updatedTabGroups,
            }
          } else {
            // No groups left
            newActiveTabGroup = null
            newActiveTab = null
          }
        }

        return {
          activeTab: newActiveTab,
          activeTabGroup: newActiveTabGroup,
          appGroups: updatedAppGroups,
          tabGroups: updatedTabGroups,
        }
      })
    },

    // Removes panel tab from project layout
    removePanelTab: (projectGroupId: string, tabId: string): boolean => {
      const state = get()
      const layout = state.projectTabLayouts.get(projectGroupId)

      if (!layout || !layout.flexLayoutData) {
        console.warn(`Layout not found for project ${projectGroupId}`)
        return false
      }

      // Clone the FlexLayout data to avoid mutations
      const flexData = JSON.parse(JSON.stringify(layout.flexLayoutData))
      let updated = false

      // Remove from center panel
      if (flexData.layout && flexData.layout.children) {
        const centerTabset = flexData.layout.children.find(
          (child: any) => child.type === "tabset",
        )
        if (centerTabset && centerTabset.children) {
          const initialLength = centerTabset.children.length
          centerTabset.children = centerTabset.children.filter(
            (tab: any) => tab.id !== tabId,
          )
          if (centerTabset.children.length < initialLength) {
            updated = true
          }
        }
      }

      // Remove from border panels
      if (flexData.borders) {
        flexData.borders = flexData.borders.map((border: any) => {
          if (border.children) {
            const initialLength = border.children.length
            const filteredChildren = border.children.filter(
              (tab: any) => tab.id !== tabId,
            )
            if (filteredChildren.length < initialLength) {
              updated = true
              return {...border, children: filteredChildren}
            }
          }
          return border
        })

        // Remove empty borders
        flexData.borders = flexData.borders.filter(
          (border: any) => border.children && border.children.length > 0,
        )
      }

      if (updated) {
        // Update both FlexLayout JSON and remove from component registry
        set((state) => {
          const newLayouts = new Map(state.projectTabLayouts)
          const updatedLayout: ProjectTabLayout = {
            flexLayoutData: flexData,
          }
          newLayouts.set(projectGroupId, updatedLayout)

          // Remove React component from registry
          const newComponentRegistry = new Map(state.componentRegistry)
          newComponentRegistry.delete(tabId)

          return {
            componentRegistry: newComponentRegistry,
            projectTabLayouts: newLayouts,
          }
        })
        return true
      }

      console.warn(
        ` Panel tab "${tabId}" not found in project ${projectGroupId}`,
      )
      return false
    },

    // Removes project group from store
    removeProjectGroup: (projectGroupId: string): boolean => {
      let removed = false
      set((state) => {
        const projectToRemove = state.projectGroups.find(
          (pg) => pg.id === projectGroupId,
        )

        if (!projectToRemove) {
          return state
        }

        // Clean up all layouts and components for this project
        const newLayouts = new Map(state.projectTabLayouts)
        const newComponentRegistry = new Map(state.componentRegistry)
        const newPanelTabRegistry = new Map(state.panelTabRegistry)

        // Helper function to extract panel IDs from FlexLayout data
        const extractPanelIds = (flexLayoutData: any): string[] => {
          const panelIds: string[] = []

          const extractFromNode = (node: any): void => {
            if (node.id && node.component === "panel-tab") {
              panelIds.push(node.id)
            }
            if (node.children) {
              node.children.forEach((child: any) => extractFromNode(child))
            }
          }

          // Extract from center layout
          if (flexLayoutData.layout) {
            extractFromNode(flexLayoutData.layout)
          }

          // Extract from borders
          if (flexLayoutData.borders) {
            flexLayoutData.borders.forEach((border: any) => {
              if (border.children) {
                border.children.forEach((tab: any) => extractFromNode(tab))
              }
            })
          }

          return panelIds
        }

        // Remove main tab layout
        newLayouts.delete(projectToRemove.mainTab.id)

        // Remove project tab layouts and their components
        projectToRemove.projectTabs.forEach((tab) => {
          const layout = newLayouts.get(tab.id)
          if (layout?.flexLayoutData) {
            // Find and remove all panel components
            const panelIds = extractPanelIds(layout.flexLayoutData)
            panelIds.forEach((panelId) => {
              newComponentRegistry.delete(panelId)
              newPanelTabRegistry.delete(panelId)
            })
          }
          newLayouts.delete(tab.id)
        })

        let updatedProjectGroups = state.projectGroups.filter(
          (projectGroup) => {
            if (projectGroup.id === projectGroupId) {
              removed = true
              return false
            }
            return true
          },
        )

        let newActiveTabGroup: TabGroupInterface | null = null
        let newActiveTab = state.activeTab
        let updatedAppGroups = state.appGroups
        const updatedTabGroups = new Map(state.tabGroups)

        if (updatedProjectGroups.length > 0) {
          // Try to use previous active group if it still exists
          let groupToExpandIndex = -1
          if (state.previousActiveProjectGroupId) {
            groupToExpandIndex = updatedProjectGroups.findIndex(
              (g) => g.id === state.previousActiveProjectGroupId,
            )
          }

          // Fallback to first available group if previous not found
          if (groupToExpandIndex === -1) {
            groupToExpandIndex = 0
          }

          let groupToExpand = updatedProjectGroups[groupToExpandIndex]

          // Expand the group (immutably)
          groupToExpand = {...groupToExpand, isCollapsed: false}

          // Set it as active project group
          newActiveTabGroup = groupToExpand

          // Set active tab in the expanded group
          if (groupToExpand.projectTabs.length > 0) {
            // Use group's active tab or first project tab
            const targetTabId =
              groupToExpand.activeTabId &&
              groupToExpand.projectTabs.find(
                (t) => t.id === groupToExpand.activeTabId,
              )
                ? groupToExpand.activeTabId
                : groupToExpand.projectTabs[0].id

            newActiveTab =
              groupToExpand.projectTabs.find((t) => t.id === targetTabId) ||
              null

            // Update the group's active tab (immutably)
            groupToExpand = {...groupToExpand, activeTabId: targetTabId}
          } else {
            // Use main tab
            newActiveTab = groupToExpand.mainTab

            groupToExpand = {
              ...groupToExpand,
              activeTabId: groupToExpand.mainTab.id,
            }
          }

          // Update the project groups array with the modified group
          updatedProjectGroups = updatedProjectGroups.map((pg, index) =>
            index === groupToExpandIndex ? groupToExpand : pg,
          )

          // Update tabGroups map with the final groupToExpand state
          updatedTabGroups.set(groupToExpand.id, groupToExpand)
        } else {
          // No project groups remain - expand app group if available
          if (state.appGroups.length > 0) {
            // Expand the first app group
            updatedAppGroups = state.appGroups.map((appGroup, index) => ({
              ...appGroup,
              isCollapsed: index !== 0, // Expand first app group, collapse others
            }))

            const firstAppGroup = updatedAppGroups[0]
            newActiveTabGroup = firstAppGroup
            newActiveTab = firstAppGroup.appTabs[0] // Use first tab in array

            // Update tabGroups map
            updatedTabGroups.set(firstAppGroup.id, firstAppGroup)
          }
        }

        // Remove the deleted project group from tabGroups map
        updatedTabGroups.delete(projectGroupId)

        return {
          activeTab: newActiveTab,
          activeTabGroup: newActiveTabGroup,
          appGroups: updatedAppGroups,
          componentRegistry: newComponentRegistry,
          panelTabRegistry: newPanelTabRegistry,
          projectGroups: updatedProjectGroups,
          projectTabLayouts: newLayouts,
          tabGroups: updatedTabGroups,
        }
      })
      return removed
    },
    // Removes project tab from group
    removeProjectTab: (projectGroupId: string, tabId: string): boolean => {
      let removed = false
      const state = get()

      // Before removing, notify all panel tabs in this project tab
      const layout = state.projectTabLayouts.get(tabId)
      if (layout && layout.flexLayoutData) {
        // Find all panel tabs and call their onProjectClose callbacks
        const panelTabIds: string[] = []

        // Check center panels
        if (
          layout.flexLayoutData.layout &&
          layout.flexLayoutData.layout.children
        ) {
          const centerTabset = layout.flexLayoutData.layout.children.find(
            (child: any) => child.type === "tabset",
          )
          if (centerTabset && centerTabset.children) {
            centerTabset.children.forEach((tab: any) => {
              if (tab.component === "panel-tab") {
                panelTabIds.push(tab.id)
              }
            })
          }
        }

        // Check border panels
        if (layout.flexLayoutData.borders) {
          layout.flexLayoutData.borders.forEach((border: any) => {
            if (border.children) {
              border.children.forEach((tab: any) => {
                if (tab.component === "panel-tab") {
                  panelTabIds.push(tab.id)
                }
              })
            }
          })
        }

        // Call onProjectClose for each panel tab
        panelTabIds.forEach((panelTabId) => {
          const panelTab = state.panelTabRegistry.get(panelTabId)
          if (panelTab && panelTab.onProjectClose) {
            // This is a dynamic panel with registered callback
            panelTab.onProjectClose(panelTabId, panelTab.title)
          } else {
            // This is a config panel - find its name and call the project tab's onProjectClose callback
            const projectTab = state.projectGroups
              .find((pg) => pg.id === projectGroupId)
              ?.projectTabs.find((pt) => pt.id === tabId) as ProjectTabInterface

            if (projectTab && projectTab.onProjectClose) {
              // Get the actual panel name from the layout
              let panelName = panelTabId
              if (layout.flexLayoutData.borders) {
                for (const border of layout.flexLayoutData.borders) {
                  if (border.children) {
                    const foundTab = border.children.find(
                      (tab: any) => tab.id === panelTabId,
                    )
                    if (foundTab && "name" in foundTab) {
                      panelName = foundTab.name || panelTabId
                      break
                    }
                  }
                }
              }
              if (
                layout.flexLayoutData.layout &&
                layout.flexLayoutData.layout.children
              ) {
                const centerTabset = layout.flexLayoutData.layout.children.find(
                  (child: any) => child.type === "tabset",
                )
                if (centerTabset && centerTabset.children) {
                  const foundTab = centerTabset.children.find(
                    (tab: any) => tab.id === panelTabId,
                  )
                  if (foundTab && "name" in foundTab) {
                    panelName = foundTab.name || panelTabId
                  }
                }
              }

              projectTab.onProjectClose(panelTabId, panelName)
            }
          }
        })
      }

      set((state) => ({
        projectGroups: state.projectGroups.map((projectGroup) => {
          if (projectGroup.id !== projectGroupId) {
            return projectGroup
          }

          const updatedProjectTabs = projectGroup.projectTabs.filter((tab) => {
            if (tab.id === tabId) {
              removed = true // Tab found and removed
              return false
            }
            return true
          })

          // If we removed the active tab, set a new active tab
          let newActiveTabId = projectGroup.activeTabId
          if (projectGroup.activeTabId === tabId) {
            newActiveTabId =
              updatedProjectTabs.length > 0
                ? updatedProjectTabs[0].id
                : projectGroup.mainTab.id
          }

          return {
            ...projectGroup,
            activeTabId: newActiveTabId,
            projectTabs: updatedProjectTabs,
          }
        }),
      }))

      return removed
    },

    renameProjectGroup: (projectGroupId: string, newName: string): boolean => {
      let isUpdated = false

      set((state) => ({
        projectGroups: state.projectGroups.map((projectGroup) => {
          if (projectGroup.id === projectGroupId) {
            isUpdated = true
            return {...projectGroup, title: newName}
          }
          return projectGroup
        }),
      }))

      return isUpdated
    },

    // Saves FlexLayout configuration from JSON string
    saveLayoutConfig: (
      projectGroupId: string,
      layoutConfigJSON: string,
    ): boolean => {
      try {
        const layoutConfig = JSON.parse(layoutConfigJSON)
        set((state) => {
          const newLayouts = new Map(state.projectTabLayouts)
          const newLayout: ProjectTabLayout = {
            flexLayoutData: layoutConfig,
          }
          newLayouts.set(projectGroupId, newLayout)
          return {projectTabLayouts: newLayouts}
        })
        return true
      } catch (error) {
        console.error("Failed to save layout config:", error)
        return false
      }
    },

    // Active tab management
    setActiveAppTab: (appTabId: string): boolean => {
      const state = get()
      let appTab: AppTabInterface | null = null
      let appGroup: AppGroupInterface | null = null

      // Find the app tab in any app group
      for (const group of state.appGroups) {
        const foundTab = group.appTabs.find((tab) => tab.id === appTabId)
        if (foundTab) {
          appTab = foundTab
          appGroup = group
          break
        }
      }

      if (!appTab || !appGroup) {
        console.warn(`App tab with id ${appTabId} not found`)
        return false
      } else {
        set({
          activeTab: appTab,
          activeTabGroup: appGroup,
        })
        return true
      }
    },

    // Sets active panel tab by ID
    setActivePanelTabById: (_tabId: string): boolean => {
      return true
    },

    // Sets active project tab in specific group
    setActiveProjectTab: (projectGroupId: string, tabId: string): boolean => {
      const state = get()
      const projectGroup = state.getProjectGroupById(projectGroupId)

      if (!projectGroup) {
        console.warn(`Project group with id ${projectGroupId} not found`)
        return false
      }

      // Update the active tab in the project group
      state.setActiveTabInProjectGroup(projectGroupId, tabId)

      // Set the global active tab
      const actualTab =
        projectGroup.mainTab.id === tabId
          ? projectGroup.mainTab
          : projectGroup.projectTabs.find((t) => t.id === tabId)

      if (actualTab) {
        set({
          activeTab: actualTab,
          activeTabGroup: projectGroup,
        })
      }
      return true
    },

    // Sets active tab within specific project group
    setActiveTabInProjectGroup: (
      projectGroupId: string,
      tabId: string,
    ): boolean => {
      let isUpdated = false

      set((state) => ({
        projectGroups: state.projectGroups.map((projectGroup) => {
          if (projectGroup.id === projectGroupId) {
            isUpdated = true
            return {...projectGroup, activeTabId: tabId}
          }
          return projectGroup
        }),
      }))

      return isUpdated
    },

    // Group title display control
    setShowGroupTitle: (show: boolean): void => {
      set({showGroupTitle: show})
    },

    showGroupTitle: false, // Default: show tooltip on hover

    // Switches to specific project group and sets it as active
    switchToProjectGroup: (projectGroupId: string): boolean => {
      const state = get()
      const targetProjectGroup = state.getProjectGroupById(projectGroupId)

      if (!targetProjectGroup) {
        console.warn(`Project group with id ${projectGroupId} not found`)
        return false
      }

      // Set the active tab based on the group's active tab
      const actualTab =
        targetProjectGroup.mainTab.id === targetProjectGroup.activeTabId
          ? targetProjectGroup.mainTab
          : targetProjectGroup.projectTabs.find(
              (t) => t.id === targetProjectGroup.activeTabId,
            )

      set((state) => ({
        activeTab: actualTab || targetProjectGroup.mainTab,
        activeTabGroup: targetProjectGroup,
        projectGroups: state.projectGroups.map((projectGroup) => ({
          ...projectGroup,
          isCollapsed: projectGroup.id !== projectGroupId,
        })),
      }))
      return true
    },

    tabGroups: new Map(), // Map<groupId,TabGroup>

    // Updates React component for existing panel tab
    updatePanelTabComponent: (
      tabId: string,
      newComponent: ReactNode,
    ): boolean => {
      const state = get()

      // Check if panel exists in any project layout (config or dynamic)
      let panelExists = false
      let panelName = tabId

      // First check: componentRegistry (dynamic panels)
      if (state.componentRegistry.has(tabId)) {
        panelExists = true
      } else {
        // Second check: Look for panel in FlexLayout JSON (config panels)
        for (const [_projectTabId, layout] of state.projectTabLayouts) {
          if (layout && layout.flexLayoutData) {
            // Check center panels
            if (
              layout.flexLayoutData.layout &&
              layout.flexLayoutData.layout.children
            ) {
              const centerTabset = layout.flexLayoutData.layout.children.find(
                (child: any) => child.type === "tabset",
              )
              if (centerTabset && centerTabset.children) {
                const foundTab = centerTabset.children.find(
                  (tab: any) => tab.id === tabId,
                )
                if (foundTab && "name" in foundTab) {
                  panelExists = true
                  panelName = foundTab.name || tabId
                  break
                }
              }
            }

            // Check border panels
            if (layout.flexLayoutData.borders) {
              for (const border of layout.flexLayoutData.borders) {
                if (border.children) {
                  const foundTab = border.children.find(
                    (tab: any) => tab.id === tabId,
                  )
                  if (foundTab) {
                    panelExists = true
                    panelName = foundTab.name || tabId
                    break
                  }
                }
              }
            }

            if (panelExists) {
              break
            }
          }
        }
      }

      if (!panelExists) {
        console.warn(`Panel tab with id ${tabId} not found in any layout`)
        return false
      }

      // Update the component in registry (works for both config and dynamic panels)
      set((state) => {
        const newComponentRegistry = new Map(state.componentRegistry)
        newComponentRegistry.set(tabId, newComponent)

        // Also auto-register config panels in panelTabRegistry if not already there
        const newPanelTabRegistry = new Map(state.panelTabRegistry)
        if (!newPanelTabRegistry.has(tabId)) {
          // This is a config panel - create a PanelTab object for it
          const configPanelTab = {
            component: newComponent,
            id: tabId,
            title: panelName,
          }
          newPanelTabRegistry.set(tabId, configPanelTab)
        }

        return {
          componentRegistry: newComponentRegistry,
          panelTabRegistry: newPanelTabRegistry,
        }
      })
      return true
    },
  }),
)

// Export configuration for external use
export {APP_CONFIG}

// Type guards for distinguishing tab and group types
export const isAppTab = (
  item:
    | AppTabInterface
    | ProjectGroupInterface
    | ProjectMainTabInterface
    | ProjectTabInterface,
): item is AppTabInterface => {
  return "tabKey" in item
}

export const isProjectGroup = (
  item:
    | AppTabInterface
    | ProjectGroupInterface
    | ProjectMainTabInterface
    | ProjectTabInterface,
): item is ProjectGroupInterface => {
  return "filePath" in item && "mainTab" in item && "projectTabs" in item
}

export const isMainTab = (
  item:
    | AppTabInterface
    | ProjectGroupInterface
    | ProjectMainTabInterface
    | ProjectTabInterface,
): item is ProjectMainTabInterface => {
  return (
    "component" in item &&
    !("tabKey" in item) &&
    !("filePath" in item) &&
    !("projectTabs" in item)
  )
}

export const isProjectTab = (
  item:
    | AppTabInterface
    | ProjectGroupInterface
    | ProjectMainTabInterface
    | ProjectTabInterface,
): item is ProjectTabInterface => {
  return (
    "component" in item &&
    !("tabKey" in item) &&
    !("filePath" in item) &&
    !("mainTab" in item) &&
    !("projectTabs" in item)
  )
}
