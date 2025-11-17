import {Component, createElement, type MouseEvent, type ReactNode} from "react"

import {Layout, Model} from "flexlayout-react"

import {logger} from "../../lib/logger"
import {useApplicationStore} from "../../store/application-store"
import type {ApplicationStore} from "../../store/store-types"
import "flexlayout-react/style/light.css"

interface Props {}

interface State {
  initialized: boolean
  lastStoreState: string
  model: any
  tabComponents: Map<string, ReactNode>
}

class StoreFlexLayoutTabGroupManager extends Component<Props, State> {
  private unsubscribe?: () => void

  constructor(props: Props) {
    super(props)

    this.state = {
      initialized: false, // Track if we've built initial model
      lastStoreState: "", // JSON string of last store state for comparison
      model: null, // FlexLayout model
      tabComponents: new Map(), // Store React components for each tab
    }
  }

  get store(): ApplicationStore {
    return useApplicationStore.getState()
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
    const activeTab = freshStore.getActiveTab()

    // Add App Group tabs (if any)
    if (
      freshStore.appGroup &&
      !freshStore.appGroup.isCollapsed &&
      freshStore.appGroup.appTabs.length > 0
    ) {
      // Add app group label
      // This creates a clickable group header
      children.push({
        className: "group-label-tab group-label-color-1",
        component: "group-label",
        enableClose: false,
        enableDrag: false,
        enableRename: false,
        id: "app-group-label",
        name: freshStore.appGroup.name,
        type: "tab",
      })

      // Add app tabs
      // This loop takes each app tab from  store and converts it into FlexLayout tab format
      freshStore.appGroup.appTabs.forEach((appTab) => {
        children.push({
          className: "group-color-1",
          component: "app-tab",
          enableClose: appTab.isCloseable,
          enableDrag: true,
          id: appTab.id,
          name: appTab.title,
          type: "tab",
        })

        // Check if this should be selected
        if (
          activeTab &&
          activeTab.type === "app-tab" &&
          activeTab.id === appTab.id
        ) {
          selectedIndex = children.length - 1
        }
      })
    }

    // Add Project Groups using fresh store
    freshStore.projectGroups.forEach((project, index) => {
      const colorNumber = ((index + 1) % 6) + 1

      // Add project group label
      // This creates the clickable group headers in the UI
      const groupLabel = {
        className: `group-label-tab group-label-color-${colorNumber}`,
        component: "group-label",
        enableClose: false,
        enableDrag: false,
        enableRename: false,
        id: `project-group-label-${project.id}`,
        name: project.name,
        type: "tab",
      }
      children.push(groupLabel)

      // Add project tabs if not collapsed
      if (!project.isCollapsed) {
        // Add main tab first
        const mainTabDef = {
          className: `group-color-${colorNumber}`,
          component: "main-tab",
          enableClose: false,
          enableDrag: false,
          id: project.mainTab.id,
          name: project.mainTab.title,
          type: "tab",
        }
        children.push(mainTabDef)

        // Check if main tab should be selected
        if (
          activeTab &&
          activeTab.type === "main-tab" &&
          activeTab.id === project.mainTab.id
        ) {
          selectedIndex = children.length - 1
        }

        // Add project tabs
        project.projectTabs.forEach((projectTab, tabIndex) => {
          // Check if this is the first tab in the group
          const isFirstTabInGroup = tabIndex === 0
          const wouldEmptyGroup = isFirstTabInGroup
          // This converts each project tab from  store into FlexLayout tab format
          const tabDef = {
            className: `group-color-${colorNumber}`,
            component: "project-tab",
            enableClose: true,
            enableDrag: !wouldEmptyGroup,
            id: projectTab.id,
            name: projectTab.title,
            type: "tab",
          }
          children.push(tabDef)

          // Check if this should be selected
          if (
            activeTab &&
            activeTab.type === "project-tab" &&
            activeTab.id === projectTab.id
          ) {
            selectedIndex = children.length - 1
          }
        })
      }
    })

    // Return complete FlexLayout JSON structure
    // recreates the FlexLayout configuration structure that tells FlexLayout how to display tabs like horizontal
    const modelJson = {
      global: {
        enableTabStrip: true,
        tabEnableClose: true,
        tabEnableRename: false,
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

    const currentStoreState = JSON.stringify({
      activeProjectGroupId: this.store.activeProjectGroupId,
      activeTab: this.store.activeTab,
      appGroup: {
        appTabs:
          this.store.appGroup?.appTabs.map((t) => ({
            id: t.id,
            isCloseable: t.isCloseable,
            title: t.title,
          })) || [],
        isCollapsed: this.store.appGroup?.isCollapsed,
      },
      previousActiveProjectGroupId: this.store.previousActiveProjectGroupId,
      projectGroups: this.store.projectGroups.map((p) => ({
        activeTabId: p.activeTabId,
        id: p.id,
        isCollapsed: p.isCollapsed,
        name: p.name,
        projectTabs: p.projectTabs.map((t) => ({id: t.id, title: t.title})),
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
    this.unsubscribe = useApplicationStore.subscribe(() => {
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
   * FlexLayout factory function - renders tab content
   */
  factory = (node: any): ReactNode => {
    const component = node.getComponent()
    const tabId = node.getId()

    // Hide group label tabs (handled by renderTab method)
    if (component === "group-label") {
      return createElement("div", {style: {display: "none"}})
    }

    // Get the React component for this tab
    const tabComponent = this.state.tabComponents.get(tabId)

    if (tabComponent) {
      return tabComponent
    }

    // Fallback content if no component set
    return createElement("div", {style: {padding: 20}}, [
      createElement("h4", {key: "title"}, `${node.getName()} Content`),
      createElement(
        "p",
        {key: "description"},
        "No component set for this tab. Use setTabComponent() to add content.",
      ),
    ])
  }

  /**
   * Handle FlexLayout actions (tab closing, etc.)
   */
  onAction = (action: any): any => {
    if (action.type === "FlexLayout_DeleteTab") {
      const tabId = action.data.node

      // Handle app tab closing
      // onAction function is the event handler that intercepts FlexLayout actions (like closing tabs) and handles them properly with  store
      const appTab = this.store.appGroup?.appTabs.find(
        (tab) => tab.id === tabId,
      )
      if (appTab) {
        this.store.closeAppTab(appTab.tabKey)
        // Store subscription will automatically trigger rebuild
        return
      }

      // Handle project tab closing with first-tab-destroys-group logic
      for (const project of this.store.projectGroups) {
        const tabIndex = project.projectTabs.findIndex(
          (tab) => tab.id === tabId,
        )
        if (tabIndex !== -1) {
          if (tabIndex === 0) {
            // First tab - destroy entire group with callback confirmation
            // Check if this is the last group - prevent closing to avoid empty UI
            if (this.store.projectGroups.length === 1) {
              alert("Cannot close the last remaining project group.")
              return // Prevent destruction
            }

            // Call the callback if it exists
            // prevents crashes when onClose is undefined
            if (project.onClose) {
              const shouldClose = project.onClose(project.id, project.name)

              // Handle  callbacks
              if (shouldClose instanceof Promise) {
                shouldClose.then((confirmed) => {
                  if (confirmed) {
                    this.store.removeProjectGroup(project.id)
                    // Store subscription will automatically trigger rebuild
                  }
                })
              } else {
                if (shouldClose) {
                  this.store.removeProjectGroup(project.id)
                  // Store subscription will automatically trigger rebuild
                } else {
                  return
                }
              }
            } else {
              // No callback - destroy immediately
              this.store.removeProjectGroup(project.id)
              // Store subscription will automatically trigger rebuild
            }

            return
          } else {
            // Not first tab - remove just this tab
            this.store.removeTabFromProjectGroup(project.id, tabId)
            // Store subscription will automatically trigger rebuild
            return
          }
        }
      }
    }

    // For all other actions, return the action to allow normal processing
    return action
  }

  /**
   * Handle FlexLayout model changes
   */
  onModelChange = (newModel: any): void => {
    // Prevent group label selection
    const fixedModel = this.preventGroupLabelSelection(newModel)
    this.setState({model: fixedModel})
  }

  /**
   * Handle tab rendering (group headers)
   */
  onRenderTab = (tabNode: any, renderValues: any): void => {
    if (tabNode.getComponent() === "group-label") {
      const groupName = tabNode.getName()

      // Determine if this is app group or project group
      let isCollapsed = false
      let isAppGroup = false

      if (groupName === this.store.appGroup?.name) {
        isCollapsed = this.store.appGroup.isCollapsed
        isAppGroup = true
      } else {
        const project = this.store.projectGroups.find(
          (p) => p.name === groupName,
        )
        isCollapsed = project ? project.isCollapsed : false
      }

      // Create the interactive group label content
      renderValues.content = createElement(
        "div",
        {
          className: "group-label-tab-button",
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()

            // Store the current state before making changes
            const wasCollapsed = isCollapsed

            if (isAppGroup) {
              // Toggle app group (simple toggle)
              this.store.appGroup.isCollapsed = !this.store.appGroup.isCollapsed
              if (
                !this.store.appGroup.isCollapsed &&
                this.store.appGroup.appTabs.length > 0
              ) {
                this.store.setActiveAppTab(this.store.appGroup.appTabs[0].id)
              }
            } else {
              // Handle project group accordion (only one group open at a time)
              const project = this.store.projectGroups.find(
                (p) => p.name === groupName,
              )
              if (project) {
                this.store.expandProjectGroupAccordion(project.id)
              }
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
          createElement("span", {key: "group-name"}, groupName),
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
      logger.error("StoreFlexLayoutTabGroupManager: Error building model", {
        component: "LayoutTabGroupManager",
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

  /**
   * API: Set React component for a tab
   * @param {string} tabId - Tab ID
   * @param {React.Component} component - React component to render
   */
  // This method creates a mapping between tab IDs and React components
  setTabComponent = (tabId: string, component: ReactNode): void => {
    this.setState((prevState) => {
      // Gets the current `tabComponents` Map from state
      const newTabComponents = new Map(prevState.tabComponents)
      // Adds the tab ID → component mapping to the Map
      newTabComponents.set(tabId, component)
      // Updates React state with the new Map
      return {tabComponents: newTabComponents}
    })
  }
}

export default StoreFlexLayoutTabGroupManager
