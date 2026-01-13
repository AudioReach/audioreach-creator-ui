import {
  Component,
  createElement,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react"

import {
  type Action,
  type IJsonModel,
  Layout,
  Model,
  type TabNode,
} from "flexlayout-react"
import {Files} from "lucide-react"

import {logger} from "~shared/lib/logger"

import type {
  OnProjectClose,
  OnTabClose,
  ProjectLayoutStoreInterface,
} from "../store/ProjectLayoutMgr.interface"
import {
  ProjectMainTab,
  ProjectTab,
  useProjectLayoutStore,
} from "../store/ProjectLayoutMgr.store"
import {getColorName} from "../utils/color-utils"

import "flexlayout-react/style/light.css"

interface Props {}

interface State {
  initialized: boolean
  lastStoreState: string
  model: Model | null
}

class ProjectLayoutManager extends Component<Props, State> {
  private unsubscribe?: () => void

  constructor(props: Props) {
    super(props)

    // Set this manager as the global manager for PanelIntegration
    PanelIntegration.setManager(this)

    this.state = {
      initialized: false, // Track if we've built initial model
      lastStoreState: "", // JSON string of last store state for comparison
      model: null, // FlexLayout model
    }
  }

  get store(): ProjectLayoutStoreInterface {
    return useProjectLayoutStore.getState()
  }

  /**
   * Build FlexLayout model JSON from store data
   * This function is a translator that converts  ApplicationStore data into FlexLayout's required JSON format
   */
  buildFlexLayoutModelFromStore = (): any => {
    // Get fresh store reference to avoid stale data
    const freshStore = this.store

    const children: any[] = []
    let selectedIndex = 0

    // Get active tab info using fresh store
    const activeTab = freshStore.activeTab
    const activeTabGroup = freshStore.activeTabGroup

    // Add App Group tabs (if any)
    freshStore.appGroups.forEach((appGroup) => {
      const colorNumber = appGroup.colorId // Use stored colorId for App Groups

      // Always add app group label (whether collapsed or not)
      const appGroupLabel = {
        className: `group-label-tab bg-${getColorName(colorNumber)} text-white`,
        component: "group-label",
        enableClose: false,
        enableDrag: false,
        enableRename: false,
        id: `app-group-label-${appGroup.id}`,
        name: appGroup.title,
        type: "tab",
      }
      children.push(appGroupLabel)

      // Only add app tabs if not collapsed
      if (!appGroup.isCollapsed) {
        // Add all app tabs from the array
        appGroup.appTabs.forEach((appTab) => {
          children.push({
            className: `border-t-2 border-${getColorName(colorNumber)}`,
            component: "app-tab",
            enableClose: true,
            enableDrag: true,
            id: appTab.id,
            name: appTab.title,
            type: "tab",
          })

          // Check if this should be selected
          if (activeTab && activeTab.id === appTab.id) {
            selectedIndex = children.length - 1
          }
        })
      }
    })

    // Add Project Groups using fresh store
    freshStore.projectGroups.forEach((project, _index) => {
      const colorNumber = project.colorId // Use stored colorId

      // Add project group label
      // This creates the clickable group headers in the UI
      const groupLabel = {
        className: `group-label-tab bg-${getColorName(colorNumber)} text-white`,
        component: "group-label",
        enableClose: false,
        enableDrag: false,
        enableRename: false,
        id: `project-group-label-${project.id}`,
        name: project.title,
        type: "tab",
      }
      children.push(groupLabel)

      // Add project tabs if not collapsed
      if (!project.isCollapsed) {
        // Add main tab first
        const mainTabDef = {
          className: `border-t-2 border-${getColorName(colorNumber)}`,
          component: "project-tab",
          enableClose: true,
          enableDrag: false, // Main tab cannot be dragged (would empty group)
          id: project.mainTab.id,
          name: project.mainTab.title,
          type: "tab",
        }
        children.push(mainTabDef)

        // Check if main tab should be selected
        const shouldSelectMain =
          (activeTabGroup?.id === project.id &&
            project.activeTabId === project.mainTab.id) ||
          (activeTab && activeTab.id === project.mainTab.id)

        if (shouldSelectMain) {
          selectedIndex = children.length - 1
        }

        // Add project tabs
        project.projectTabs.forEach((projectTab, _tabIndex) => {
          // This converts each project tab from  store into FlexLayout tab format
          const tabDef = {
            className: `border-t-2 border-${getColorName(colorNumber)}`,
            component: "project-tab",
            enableClose: true,
            enableDrag: true, // Project tabs can be dragged
            id: projectTab.id,
            name: projectTab.title,
            type: "tab",
          }
          children.push(tabDef)

          // Check if this should be selected (prioritize group's activeTabId for active group)
          const shouldSelect =
            (activeTabGroup?.id === project.id &&
              project.activeTabId === projectTab.id) ||
            (activeTab && activeTab.id === projectTab.id)

          if (shouldSelect) {
            selectedIndex = children.length - 1
          }

          // Use group's activeTabId if global activeTab doesn't match
          if (
            project.activeTabId === projectTab.id &&
            activeTabGroup?.id === project.id
          ) {
            if (!shouldSelect) {
              selectedIndex = children.length - 1
            }
          }
        })
      }
    })

    // Return complete FlexLayout JSON structure
    // recreates the FlexLayout configuration structure that tells FlexLayout how to display tabs like horizontal
    const modelJson = {
      global: {
        borderEnableAutoHide: true,
        enableEdgeDock: false,
        tabEnableClose: true,
        tabEnableRename: false,
        tabSetEnableClose: false,
        tabSetEnableDrag: true,
        tabSetEnableDrop: true,
        tabSetEnableMaximize: true,
      },
      layout: {
        children: [
          {
            children,
            enableTabStrip: true,
            selected: selectedIndex,
            type: "tabset",
            weight: 100,
          },
        ],
        id: "root",
        type: "row",
      },
    }

    return modelJson
  }

  /**
   * Check if store state changed and rebuild model only if necessary
   */
  checkAndRebuildModel = (): void => {
    if (!this.store) {
      return
    }

    // Create a simplified state representation for comparison
    const currentStoreState = JSON.stringify({
      activeTab: this.store.activeTab?.id || null,
      activeTabGroup: this.store.activeTabGroup?.id || null,
      appGroups: this.store.appGroups.map((appGroup) => ({
        activeTabId: appGroup.activeTabId,
        appTabs: appGroup.appTabs.map((t) => ({
          id: t.id,
          title: t.title,
        })),
        id: appGroup.id,
        isCollapsed: appGroup.isCollapsed,
        title: appGroup.title,
      })),
      previousActiveProjectGroupId: this.store.previousActiveProjectGroupId,
      projectGroups: this.store.projectGroups.map((p) => ({
        activeTabId: p.activeTabId,
        id: p.id,
        isCollapsed: p.isCollapsed,
        projectTabs: p.projectTabs.map((t) => ({id: t.id, title: t.title})),
        title: p.title,
      })),
    })

    // Compare with last known state
    if (currentStoreState !== this.state.lastStoreState) {
      this.setState({lastStoreState: currentStoreState})
      this.rebuildModel()
    }
  }

  componentDidMount(): void {
    // Subscribe to store changes for automatic UI updates
    this.unsubscribe = useProjectLayoutStore.subscribe(() => {
      // Check if store state actually changed before rebuilding
      this.checkAndRebuildModel()
    })

    // Build initial model when component mounts
    this.rebuildModel()
  }

  componentWillUnmount(): void {
    // Clean up store subscription
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }

  /**
   * Create FlexLayout model from stored FlexLayout JSON
   */
  createFlexLayoutModel = (tabId: string): Model => {
    const appStore = useProjectLayoutStore.getState()
    const savedLayoutJson = appStore.getLayoutConfig(tabId)

    if (savedLayoutJson) {
      try {
        const flexLayoutData = JSON.parse(savedLayoutJson)

        // Ensure global properties exist
        if (!flexLayoutData.global) {
          flexLayoutData.global = {}
        }

        flexLayoutData.global = {
          borderEnableAutoHide: true,
          enableEdgeDock: false,
          tabEnableClose: true,
          tabEnableRename: false,
          tabSetEnableClose: false,
          tabSetEnableDrag: true,
          tabSetEnableDrop: true,
          tabSetEnableMaximize: true,
          ...flexLayoutData.global,
        }

        return Model.fromJson(flexLayoutData)
      } catch (error) {
        console.error("Failed to parse FlexLayout JSON:", error)
      }
    }

    // Return empty model if no layout found
    return Model.fromJson({
      global: {
        borderEnableAutoHide: true,
        enableEdgeDock: false,
        tabEnableClose: true,
        tabEnableRename: false,
        tabSetEnableClose: false,
        tabSetEnableDrag: true,
        tabSetEnableDrop: true,
        tabSetEnableMaximize: true,
      },
      layout: {children: [], type: "row"},
    })
  }

  /**
   * FlexLayout factory function - renders tab content
   */
  factory = (node: TabNode): ReactNode => {
    const component = node.getComponent()
    const tabId = node.getId()

    // Hide group label tabs (handled by renderTab method)
    if (component === "group-label") {
      return createElement("div", {style: {display: "none"}})
    }

    // Handle panel tabs with component registry lookup
    if (component === "panel-tab") {
      const appStore = useProjectLayoutStore.getState()
      const panelComponent = appStore.componentRegistry.get(tabId)

      if (panelComponent) {
        return panelComponent
      }

      // external factory handle config panels
      return null // This allows the external factory in PanelIntegration to handle it
    }

    // Check if this is an app tab - search through app groups
    const appStore = useProjectLayoutStore.getState()
    for (const appGroup of appStore.appGroups) {
      // Check if it's one of the app tabs
      const appTab = appGroup.appTabs.find((tab) => tab.id === tabId)
      if (appTab) {
        // Inject tabId prop into the component
        if (appTab.component && typeof appTab.component === "object") {
          return createElement((appTab.component as any).type, {
            ...(appTab.component as any).props,
            tabId: appTab.id,
          })
        }
        return appTab.component
      }
    }

    // Check if this is a project tab - search through project groups
    for (const projectGroup of appStore.projectGroups) {
      // Check if it's the main tab
      if (projectGroup.mainTab.id === tabId) {
        // Check if we have a reactive component stored
        const reactiveComponent = (projectGroup.mainTab as any)
          .reactiveComponent
        if (reactiveComponent) {
          return reactiveComponent
        }
        // Fallback to basic content if no reactive component
        return createElement("div", {style: {padding: 20}}, [
          createElement("h4", {key: "title"}, `${projectGroup.mainTab.title}`),
          createElement("p", {key: "description"}, "Main tab content"),
        ])
      }

      // Check if it's one of the project tabs
      const projectTab = projectGroup.projectTabs.find(
        (tab) => tab.id === tabId,
      )
      if (projectTab) {
        // Check if we have a reactive component stored (for complex tabs)
        const reactiveComponent = (projectTab as any).reactiveComponent
        if (reactiveComponent) {
          return reactiveComponent
        }

        // Check if this is a simple tab with a component
        if (projectTab.component) {
          return projectTab.component
        }

        // Fallback to basic content if no reactive component or simple component
        return createElement("div", {style: {padding: 20}}, [
          createElement("h4", {key: "title"}, `${projectTab.title}`),
          createElement("p", {key: "description"}, "Project tab content"),
        ])
      }
    }

    // Fallback content if no component set
    return createElement("div", {style: {padding: 20}}, [
      createElement("h4", {key: "title"}, `${node.getName()} Content`),
      createElement("p", {key: "description"}, "Component not found in store."),
    ])
  }

  /**
   * Handle FlexLayout actions (tab closing, etc.)
   * handle both regular tabs and panel tab closing with onClose callbacks
   */
  onAction = (action: Action): Action | undefined => {
    // Handle tab selection to update store's activeTabId
    if (action.type === "FlexLayout_SelectTab") {
      const tabId = action.data.tabNode || action.data.node || action.data

      // Check if this is an app tab selection
      for (const appGroup of this.store.appGroups) {
        // Check if it's one of the app tabs
        const appTab = appGroup.appTabs.find((tab) => tab.id === tabId)
        if (appTab) {
          // Update app group's activeTabId using store's set method
          useProjectLayoutStore.setState((state) => {
            const updatedAppGroups = state.appGroups.map((ag) =>
              ag.id === appGroup.id ? {...ag, activeTabId: tabId} : ag,
            )
            const updatedTabGroups = new Map(state.tabGroups)
            const updatedAppGroup = updatedAppGroups.find(
              (ag) => ag.id === appGroup.id,
            )
            if (updatedAppGroup) {
              updatedTabGroups.set(appGroup.id, updatedAppGroup)
            }
            return {
              appGroups: updatedAppGroups,
              tabGroups: updatedTabGroups,
            }
          })
          return action
        }
      }

      // Find which project group this tab belongs to and update its activeTabId
      for (const projectGroup of this.store.projectGroups) {
        // Check if it's the main tab
        if (projectGroup.mainTab.id === tabId) {
          useProjectLayoutStore
            .getState()
            .setActiveProjectTab(projectGroup.id, tabId)
          return action
        }

        // Check if it's one of the project tabs
        const projectTab = projectGroup.projectTabs.find(
          (tab) => tab.id === tabId,
        )
        if (projectTab) {
          useProjectLayoutStore
            .getState()
            .setActiveProjectTab(projectGroup.id, tabId)
          return action
        }
      }

      return action
    }

    if (action.type === "FlexLayout_DeleteTab") {
      const tabId = action.data.node
      // Handle app tab closing first - check for group destruction scenarios
      let appTab = null
      let appGroup = null

      // Find the app tab and its group
      for (const group of this.store.appGroups) {
        const foundTab = group.appTabs.find((tab) => tab.id === tabId)
        if (foundTab) {
          appTab = foundTab
          appGroup = group
          break
        }
      }

      if (appTab && appGroup) {
        // Check if this is the last tab - if so, let closeAppTab handle everything
        if (appGroup.appTabs.length === 1) {
          // Last tab - let closeAppTab method handle both individual and group callbacks
          this.store.closeAppTab(tabId)
          // Store subscription will automatically trigger rebuild
          return
        } else {
          // Multiple tabs - handle individual tab closing
          // Call the app tab's close callback first
          if (appTab.onTabClose) {
            const shouldClose = appTab.onTabClose(tabId, appTab.title)
            if (!shouldClose) {
              return // Prevent closing
            }
          }

          // After permission granted, call cleanup callback
          if (
            "onAppClose" in appTab &&
            typeof appTab.onAppClose === "function"
          ) {
            appTab.onAppClose(tabId, appTab.title)
          }

          // Use the enhanced closeAppTab method for individual tab closing
          this.store.closeAppTab(tabId)
          // Store subscription will automatically trigger rebuild
          return
        }
      }

      // Handle project tab closing - check for group destruction scenarios FIRST
      for (const project of this.store.projectGroups) {
        // Check if it's the main tab being closed - this should destroy the entire group
        if (project.mainTab.id === tabId) {
          // Main tab closing - this is GROUP DESTRUCTION
          if (project.onClose) {
            const shouldClose = project.onClose(project.id, project.title)

            // Handle callbacks
            if (shouldClose instanceof Promise) {
              shouldClose
                .then((confirmed) => {
                  if (confirmed) {
                    PanelIntegration.cleanupProjectPanels(project.id)
                    this.store.removeProjectGroup(project.id)
                    // Store subscription will automatically trigger rebuild
                  }
                })
                .catch((error) => {
                  console.error("Error in project close callback:", error)
                })
              return
            } else {
              // Handle synchronous callback result
              if (!shouldClose) {
                return // User cancelled, don't close the tab
              }
            }
          }

          // Notify all project tabs before group destruction
          project.projectTabs.forEach((projectTab) => {
            if (
              "onProjectClose" in projectTab &&
              typeof projectTab.onProjectClose === "function"
            ) {
              projectTab.onProjectClose(projectTab.id, projectTab.title)
            }
          })

          // Proceed with group destruction
          PanelIntegration.cleanupProjectPanels(project.id)
          this.store.removeProjectGroup(project.id)
          // Store subscription will automatically trigger rebuild
          return
        }

        // Check if it's one of the project tabs
        const tabIndex = project.projectTabs.findIndex(
          (tab) => tab.id === tabId,
        )
        if (tabIndex !== -1) {
          // This is INDIVIDUAL PROJECT TAB CLOSE (not group destruction)
          const projectTab = project.projectTabs.find((t) => t.id === tabId)
          if (projectTab) {
            // Call individual tab close callback
            if (projectTab.onTabClose) {
              const shouldClose = projectTab.onTabClose(tabId, projectTab.title)
              if (!shouldClose) {
                return // Prevent closing
              }
            }
            // After permission granted, call cleanup callback
            if (
              "onProjectClose" in projectTab &&
              typeof projectTab.onProjectClose === "function"
            ) {
              projectTab.onProjectClose(tabId, projectTab.title)
            }
          }

          // Proceed with individual tab removal
          this.store.removeProjectTab(project.id, tabId)
          // Store subscription will automatically trigger rebuild
          return
        }
      }
    }

    // For all other actions, return the action to allow normal processing
    return action
  }

  /**
   * Handle FlexLayout model changes
   */
  onModelChange = (newModel: Model): void => {
    // Prevent group label selection
    const fixedModel = this.preventGroupLabelSelection(newModel)
    this.setState({model: fixedModel})
  }

  /**
   * Handle tab rendering (group headers)
   */
  onRenderTab = (tabNode: any, renderValues: any): void => {
    const component = tabNode.getComponent()

    if (component === "group-label") {
      const groupName = tabNode.getName()
      const tabId = tabNode.getId() // Get the tab ID which contains group ID

      // Extract group ID from tab ID (format: "app-group-label-{groupId}" or "project-group-label-{groupId}")
      let groupId = null
      if (tabId.startsWith("app-group-label-")) {
        groupId = tabId.replace("app-group-label-", "")
      } else if (tabId.startsWith("project-group-label-")) {
        groupId = tabId.replace("project-group-label-", "")
      }

      // Determine if this is app group or project group using the extracted group ID
      let isCollapsed = false
      let targetGroup = null
      let colorNumber = 1

      // Check if this is an app group by ID
      const appGroup = this.store.appGroups.find((ag) => ag.id === groupId)
      if (appGroup) {
        isCollapsed = appGroup.isCollapsed
        targetGroup = appGroup
        colorNumber = appGroup.colorId
      } else {
        // Check if this is a project group by ID
        const project = this.store.projectGroups.find((p) => p.id === groupId)
        if (project) {
          isCollapsed = project.isCollapsed
          targetGroup = project
          colorNumber = project.colorId
        }
      }

      // Create the interactive group label content with Tailwind colors
      const showTooltip = !this.store.showGroupTitle // false = show tooltip, true = no tooltip
      const bgColor = `bg-${getColorName(colorNumber)}`

      renderValues.content = createElement(
        "div",
        {
          className: `cursor-pointer px-0.5 py-0.5 rounded  inline-flex  gap-0.5 mb-0.1  text-xs  ${bgColor} text-white`,
          ...(showTooltip && {title: groupName}), // Add tooltip only if showGroupTitle is false
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()

            // Store the current state before making changes
            const wasCollapsed = isCollapsed

            // Use the specific group ID instead of searching by name
            if (targetGroup) {
              this.store.expandTabGroup(targetGroup.id)
            }

            if (wasCollapsed) {
              this.setState(
                {
                  initialized: false,
                  lastStoreState: "",
                  model: null,
                },
                () => {
                  this.rebuildModel()
                },
              )
            } else {
            }
          },
        },
        [
          createElement(Files, {
            key: "files-icon",
            size: 16,
            style: {cursor: "pointer"},
          }),
          createElement(
            "span",
            {
              className: "arrow-icon",
              key: "arrow-icon",
            },
            isCollapsed ? "▶" : "▼",
          ),
        ],
      )
    }
  }

  onRenderTabSet = (tabSetNode: any, renderValues: any): void => {
    renderValues.stickyButtons = []
  }

  /**
   * Prevent group labels from being selected
   */
  preventGroupLabelSelection = (newModel: any): any => {
    const fixSelectedTab = (node: any): void => {
      if (node.getType() === "tabset") {
        const children = node.getChildren()
        const selectedIndex = node.getSelected()
        const selectedNode = children[selectedIndex]

        if (selectedNode && selectedNode.getComponent() === "group-label") {
          // Find the first actual tab (not group label) to select instead
          for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (child.getComponent() !== "group-label") {
              node.setSelected(i)
              break
            }
          }
        }
      }

      if (node.getChildren && typeof node.getChildren === "function") {
        node.getChildren().forEach((child: any) => {
          if (child && typeof child.getType === "function") {
            fixSelectedTab(child)
          }
        })
      }
    }

    fixSelectedTab(newModel.getRoot())
    return newModel
  }

  /**
   * Internal method to rebuild FlexLayout model(like refresh button)
   */
  rebuildModel = (): void => {
    if (!this.store) {
      return
    }

    try {
      const modelJson = this.buildFlexLayoutModelFromStore()
      const newModel = Model.fromJson(modelJson)

      this.setState({
        initialized: true,
        model: newModel,
      })
    } catch (error) {
      logger.error("ProjectLayoutManager: Error building model", {
        action: "rebuild_model",
        component: "ProjectLayoutManager",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  render(): ReactNode {
    const {initialized, model} = this.state

    // Show loading until model is built
    if (!initialized || !model) {
      return createElement(
        "div",
        {
          style: {
            alignItems: "center",
            color: "#666",
            display: "flex",
            height: "100%",
            justifyContent: "center",
          },
        },
        "Loading...",
      )
    }

    // Render FlexLayout with all  features
    return createElement(Layout, {
      factory: this.factory,
      model,
      onAction: this.onAction,
      onModelChange: this.onModelChange,
      onRenderTab: this.onRenderTab,
      onRenderTabSet: this.onRenderTabSet,
    })
  }
}

/**
 * Panel Integration
 */
export class PanelIntegration {
  // Global manager storage
  private static globalManager: ProjectLayoutManager | null = null

  /**
   * Cleanup method to prevent memory leaks when projects are closed
   */
  static cleanupProjectPanels(projectGroupId: string): void {
    if (!this.globalManager) {
      return
    }
    // The store will handle cleanup automatically when project groups are removed
    logger.info(`Cleaning up project panels for group: ${projectGroupId}`)
  }

  /**
   * Create project Maintab from JSON config file.
   * Project Maintab may have a list of PanelTabs
   * @param tabTitle Main tab title
   * @param onMainTabClose Callback when this tab is closed
   * @param factory callback to create panels
   * @param flexLayoutConfig layout config in JSON format
   * @param onPanelTabClose Optional callback for config panel tabs
   */
  static createProjectMainTab(
    tabTitle: string,
    onMainTabClose: OnTabClose,
    factory: (node: TabNode) => ReactNode,
    flexLayoutConfig: IJsonModel,
    onPanelTabClose?: OnTabClose,
  ): ProjectMainTab {
    if (!this.globalManager) {
      throw new Error(
        "Manager not initialized. Call PanelIntegration.setManager() first.",
      )
    }

    // Create ProjectMainTab instance with FlexLayout data
    const panelLayout = {flexLayoutData: flexLayoutConfig}
    const mainTab = new ProjectMainTab(tabTitle, panelLayout, onMainTabClose)

    // Store FlexLayout JSON directly
    const store = useProjectLayoutStore.getState()
    store.saveLayoutConfig(mainTab.id, JSON.stringify(flexLayoutConfig))

    // Create reactive panel component
    const ReactivePanelComponent = createElement(() => {
      const [model, setModel] = useState(() => {
        if (!this.globalManager) {
          throw new Error("Manager not available")
        }
        return this.globalManager.createFlexLayoutModel(mainTab.id)
      })

      useEffect(() => {
        let mounted = true
        const unsubscribe = useProjectLayoutStore.subscribe(
          (state, prevState) => {
            if (!mounted) {
              return
            }

            const currentLayout = state.projectTabLayouts.get(mainTab.id)
            const prevLayout = prevState?.projectTabLayouts.get(mainTab.id)
            const currentRegistry = state.componentRegistry
            const prevRegistry = prevState?.componentRegistry

            if (
              currentLayout !== prevLayout ||
              currentRegistry !== prevRegistry
            ) {
              if (this.globalManager) {
                const newModel = this.globalManager.createFlexLayoutModel(
                  mainTab.id,
                )
                setModel(newModel)
              }
            }
          },
        )

        return () => {
          mounted = false
          if (unsubscribe) {
            unsubscribe()
          }
        }
      }, [])

      return createElement(
        "div",
        {
          style: {height: "calc(100% - 30px)"},
        },
        createElement(Layout, {
          factory: (node: any) => {
            const component = node.getComponent()
            const tabId = node.getId()

            // Handle panel tabs with component registry lookup
            if (component === "panel-tab") {
              const appStore = useProjectLayoutStore.getState()
              const panelComponent = appStore.componentRegistry.get(tabId)

              if (panelComponent) {
                return panelComponent
              }
            }

            const customComponent = this.globalManager!.factory(node)
            if (customComponent !== null) {
              return customComponent
            }
            return factory(node)
          },
          model,
          onAction: (action: any) => {
            // Handle panel tab closing with callbacks
            if (action.type === "FlexLayout_DeleteTab") {
              const tabId = action.data.node
              const appStore = useProjectLayoutStore.getState()

              // Check if this is a panel tab (either from componentRegistry or config)
              const isDynamicPanel = appStore.componentRegistry.has(tabId)
              const panelTab = appStore.panelTabRegistry.get(tabId)

              if (isDynamicPanel && panelTab) {
                // This is a dynamic panel tab - get the PanelTab object and call its callback
                if (panelTab.onTabClose) {
                  const shouldClose = panelTab.onTabClose(tabId, panelTab.title)
                  if (!shouldClose) {
                    return // Prevent closing
                  }
                }

                // Remove from store
                appStore.removePanelTab(mainTab.id, tabId)
              } else {
                let panelName = "Panel name not found"
                const appStore = useProjectLayoutStore.getState()
                const layoutJson = appStore.getLayoutConfig(mainTab.id)

                if (layoutJson) {
                  try {
                    const layoutData = JSON.parse(layoutJson)

                    // Search in center layout
                    const searchInLayout = (node: any): string | null => {
                      if (node.id === tabId) {
                        return node.name
                      }
                      if (node.children) {
                        for (const child of node.children) {
                          const result = searchInLayout(child)
                          if (result) {
                            return result
                          }
                        }
                      }
                      return null
                    }

                    // Search in borders
                    const searchInBorders = (borders: any[]): string | null => {
                      for (const border of borders) {
                        if (border.children) {
                          for (const tab of border.children) {
                            if (tab.id === tabId) {
                              return tab.name
                            }
                          }
                        }
                      }
                      return null
                    }

                    let foundName = null

                    // Search in layout first
                    if (layoutData.layout) {
                      foundName = searchInLayout(layoutData.layout)
                    }

                    // If not found, search in borders
                    if (!foundName && layoutData.borders) {
                      foundName = searchInBorders(layoutData.borders)
                    }

                    if (foundName) {
                      panelName = foundName
                    } else {
                    }
                  } catch (error) {
                    console.error("Error parsing layout JSON:", error)
                  }
                }

                if (onPanelTabClose) {
                  const shouldClose = onPanelTabClose(tabId, panelName)
                  if (!shouldClose) {
                    return // Prevent closing
                  }
                }
              }
            }

            return action
          },
          onModelChange: (newModel: any) => {
            const layoutJson = newModel.toJson()
            logger.info(
              `Layout Updated (Main Tab: ${mainTab.title}):${JSON.stringify(layoutJson, null, 2)}`,
            )
            useProjectLayoutStore
              .getState()
              .saveLayoutConfig(mainTab.id, JSON.stringify(layoutJson))
          },
        }),
      )
    })

    // Store the component directly in the main tab
    ;(mainTab as any).reactiveComponent = ReactivePanelComponent

    return mainTab
  }

  static createProjectTab(
    tabTitle: string,
    factory: ((node: TabNode) => ReactNode) | ReactNode,
    onProjectTabClose: OnTabClose,
    onProjectTabCleanup: OnProjectClose,
    flexLayoutConfig?: IJsonModel,
    onPanelTabClose?: OnTabClose,
  ): ProjectTab {
    if (!this.globalManager) {
      throw new Error(
        "Manager not initialized. Call PanelIntegration.setManager() first.",
      )
    }

    // Detect if this is a simple tab (ReactNode) or complex tab (function + layout)
    const isSimpleTab = typeof factory !== "function" || !flexLayoutConfig

    let projectTab: ProjectTab

    if (isSimpleTab) {
      // Create simple tab with ReactNode component
      projectTab = new ProjectTab(
        tabTitle,
        factory as ReactNode,
        onProjectTabClose,
        onProjectTabCleanup,
      )
    } else {
      // Create complex tab with FlexLayout
      const panelLayout = {flexLayoutData: flexLayoutConfig}
      projectTab = new ProjectTab(
        tabTitle,
        panelLayout,
        onProjectTabClose,
        onProjectTabCleanup,
      )
    }

    // Access global store
    const store = useProjectLayoutStore.getState()

    // Find active project group to add tab to
    const activeProjectGroup = store.getActiveProjectGroup()
    if (!activeProjectGroup) {
      throw new Error("No active project group found. Create a main tab first.")
    }

    // Add the project tab to the active group
    store.addTabToProjectGroup(activeProjectGroup.id, projectTab)

    // For complex tabs, store FlexLayout JSON and create reactive component
    if (!isSimpleTab && flexLayoutConfig) {
      // Store FlexLayout JSON directly
      store.saveLayoutConfig(projectTab.id, JSON.stringify(flexLayoutConfig))

      // Create reactive panel component
      const ReactivePanelComponent = createElement(() => {
        const [model, setModel] = useState(() => {
          if (!this.globalManager) {
            throw new Error("Manager not available")
          }
          return this.globalManager.createFlexLayoutModel(projectTab.id)
        })

        useEffect(() => {
          let mounted = true
          const unsubscribe = useProjectLayoutStore.subscribe(
            (state, prevState) => {
              if (!mounted) {
                return
              }

              const currentLayout = state.projectTabLayouts.get(projectTab.id)
              const prevLayout = prevState?.projectTabLayouts.get(projectTab.id)

              if (currentLayout !== prevLayout) {
                if (this.globalManager) {
                  const newModel = this.globalManager.createFlexLayoutModel(
                    projectTab.id,
                  )
                  setModel(newModel)
                }
              }
            },
          )

          return () => {
            mounted = false
            if (unsubscribe) {
              unsubscribe()
            }
          }
        }, [])

        return createElement(
          "div",
          {
            style: {height: "calc(100% - 30px)"},
          },
          createElement(Layout, {
            factory: (node: any) => {
              const customComponent = this.globalManager!.factory(node)
              if (customComponent !== null) {
                return customComponent
              }
              return factory(node)
            },
            model,
            onAction: (action: any) => {
              // Handle panel tab closing with callbacks
              if (action.type === "FlexLayout_DeleteTab") {
                const tabId = action.data.node
                const appStore = useProjectLayoutStore.getState()

                // Check if this is a panel tab (either from componentRegistry or config)
                const isDynamicPanel = appStore.componentRegistry.has(tabId)
                const panelTab = appStore.panelTabRegistry.get(tabId)

                if (isDynamicPanel && panelTab) {
                  // This is a dynamic panel tab - get the PanelTab object and call its callback
                  if (panelTab.onTabClose) {
                    const shouldClose = panelTab.onTabClose(
                      tabId,
                      panelTab.title,
                    )
                    if (!shouldClose) {
                      return // Prevent closing
                    }
                  }

                  // Remove from store
                  appStore.removePanelTab(projectTab.id, tabId)
                } else {
                  // This is a config panel - get the actual panel name from layout
                  let panelName = "Panel name not found" // Default fallback

                  // Try to get the actual panel name from the stored FlexLayout JSON
                  const layoutJson = appStore.getLayoutConfig(projectTab.id)

                  if (layoutJson) {
                    try {
                      const layoutData = JSON.parse(layoutJson)

                      // Search in center layout
                      const searchInLayout = (node: any): string | null => {
                        if (node.id === tabId) {
                          return node.name
                        }
                        if (node.children) {
                          for (const child of node.children) {
                            const result = searchInLayout(child)
                            if (result) {
                              return result
                            }
                          }
                        }
                        return null
                      }

                      // Search in borders
                      const searchInBorders = (
                        borders: any[],
                      ): string | null => {
                        for (const border of borders) {
                          if (border.children) {
                            for (const tab of border.children) {
                              if (tab.id === tabId) {
                                return tab.name
                              }
                            }
                          }
                        }
                        return null
                      }

                      let foundName = null

                      // Search in layout first
                      if (layoutData.layout) {
                        foundName = searchInLayout(layoutData.layout)
                      }

                      // If not found, search in borders
                      if (!foundName && layoutData.borders) {
                        foundName = searchInBorders(layoutData.borders)
                      }

                      if (foundName) {
                        panelName = foundName
                      }
                    } catch (error) {
                      console.error(
                        `[PROJECT TAB ${projectTab.title}] Error parsing layout JSON:`,
                        error,
                      )
                    }
                  }

                  // Use the panel tab close callback for config panels (for confirmation)
                  if (onPanelTabClose) {
                    const shouldClose = onPanelTabClose(tabId, panelName)
                    if (!shouldClose) {
                      return // Prevent closing
                    }
                  }
                }
              }

              return action
            },
            onModelChange: (newModel: any) => {
              const layoutJson = newModel.toJson()
              logger.info(
                ` Panel Layout Updated (Project Tab: ${projectTab.title}):${JSON.stringify(
                  layoutJson,
                  null,
                  2,
                )}`,
              )
              useProjectLayoutStore
                .getState()
                .saveLayoutConfig(projectTab.id, JSON.stringify(layoutJson))
            },
          }),
        )
      })

      // Store the component directly in the project tab
      ;(projectTab as any).reactiveComponent = ReactivePanelComponent
    }

    return projectTab
  }

  /**
   * Method to set the global manager (call once from main app)
   */
  static setManager(manager: ProjectLayoutManager): void {
    this.globalManager = manager
  }
}

export default ProjectLayoutManager
