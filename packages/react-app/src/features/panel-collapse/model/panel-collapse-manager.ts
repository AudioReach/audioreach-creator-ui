/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {Actions, DockLocation, type Model, type Node} from 'flexlayout-react';

import {
  CENTER_TABSET_ID,
  PLACEHOLDER_COMPONENT_NAME,
} from '~shared/config/utils';
import {useProjectLayoutStore} from '~shared/store/use-project-layout-store';

import type {
  LayoutJson,
  LayoutNodeJson,
  PanelState,
} from './panel-collapse.types';
import {
  DEFAULT_PANEL_STATE,
  usePanelCollapseStore,
} from './use-panel-collapse-store';

// The 3 panel positions the toolbar buttons can toggle
const PANELS = ['left', 'right', 'bottom'] as const;
type PanelPosition = (typeof PANELS)[number]; // 'left' | 'right' | 'bottom'

// Default weight restored when expanding a panel with no saved weight
const DEFAULT_PANEL_WEIGHT = 20;

// Prevents near-zero weights from a splitter micro-drag corrupting savedWeights.
const MINIMUM_VISIBLE_WEIGHT = 1;

// Stable IDs for the placeholder tabs inserted when a panel's tabset is deleted
const PLACEHOLDER_TAB_IDS = {
  bottom: 'bottom-placeholder-tab',
  left: 'left-placeholder-tab',
  right: 'right-placeholder-tab',
} as const;
type Side = keyof typeof PLACEHOLDER_TAB_IDS;

// Finds root's direct child that has center nested somewhere inside it — the "top
// area" node.
const findTopAreaNode = (root: LayoutNodeJson): LayoutNodeJson | null => {
  const containsCenter = (node: LayoutNodeJson): boolean => {
    if (node.id === CENTER_TABSET_ID) {
      return true;
    }
    return (node.children ?? []).some(containsCenter);
  };
  return root.children?.find(containsCenter) ?? null;
};

// Finds center's parent — its siblings there are left (before) and right (after)
// center.
const findCenterParent = (node: LayoutNodeJson): LayoutNodeJson | null => {
  if (node.children?.some((child) => child.id === CENTER_TABSET_ID)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const result = findCenterParent(child);
    if (result) {
      return result;
    }
  }
  return null;
};

// Bottom = root children other than the top area; left/right = center's siblings
// before/after it.
const findPositionNodes = (
  json: LayoutJson,
  position: PanelPosition,
): LayoutNodeJson[] => {
  const root = json.layout;
  const topAreaNode = findTopAreaNode(root);

  if (position === 'bottom') {
    return root.children.filter((child) => child !== topAreaNode);
  }

  // Search only within the top area, so bottom (also a root child) isn't mistaken
  // for a right sibling of center.
  const centerParent = topAreaNode ? findCenterParent(topAreaNode) : null;
  const centerIndex = centerParent
    ? (centerParent.children?.findIndex((c) => c.id === CENTER_TABSET_ID) ?? -1)
    : -1;

  if (!centerParent || centerIndex === -1) {
    return [];
  }

  return position === 'left'
    ? centerParent.children!.slice(0, centerIndex)
    : centerParent.children!.slice(centerIndex + 1);
};

// Sets a node's weight to 0 (collapse) or restores it from savedWeights (expand).

const collapseNode = (
  node: LayoutNodeJson,
  collapse: boolean,
  savedWeights: Record<string, number>,
  updates: Array<[string, number]>,
): void => {
  if (!node || node.id === undefined) {
    return;
  }
  if (collapse) {
    const weight = node.weight ?? 0;
    if (weight >= MINIMUM_VISIBLE_WEIGHT) {
      savedWeights[node.id] = weight;
    }
    node.weight = 0;
  } else {
    node.weight = savedWeights[node.id] ?? DEFAULT_PANEL_WEIGHT;
  }
  updates.push([node.id, node.weight]);
};

const getVisibility = (panelStates: Record<string, PanelState>): PanelState => {
  const projectId = useProjectLayoutStore.getState().getActiveProjectGroup()
    ?.mainTab.id;
  return (projectId && panelStates[projectId]) || {...DEFAULT_PANEL_STATE};
};

// Inserts a non-splittable placeholder tabset when a panel's tabset is deleted
const ensureSidePlaceholder = (model: Model, side: Side): void => {
  const tabId = PLACEHOLDER_TAB_IDS[side];
  if (model.getNodeById(tabId)) {
    return;
  }
  let targetNodeId: string;
  let dockLocation: DockLocation;
  if (side === 'bottom') {
    // Bottom sits directly under root, so docking BOTTOM onto root always recreates
    // it full-width.
    const rootRow = model.getRootRow();
    if (!rootRow) {
      return;
    }
    targetNodeId = rootRow.getId();
    dockLocation = DockLocation.BOTTOM;
  } else {
    // Center can never move (drag/split/drop are all disabled on it), so it's
    // always there to dock left/right against.
    const centerPanelNode = model.getNodeById(CENTER_TABSET_ID);
    if (!centerPanelNode) {
      return;
    }
    targetNodeId = centerPanelNode.getId();
    dockLocation = side === 'left' ? DockLocation.LEFT : DockLocation.RIGHT;
  }

  model.doAction(
    Actions.addNode(
      {
        component: PLACEHOLDER_COMPONENT_NAME,
        enableClose: false,
        enableDrag: false,
        id: tabId,
        name: 'Drop panels here',
        type: 'tab',
      },
      targetNodeId,
      dockLocation,
      -1,
    ),
  );
  // Disable splitting so tabs must drop INTO the placeholder, not beside it
  const placeholderNode = model.getNodeById(tabId);
  const parentTabset: Node | undefined = placeholderNode?.getParent();
  if (parentTabset) {
    model.doAction(
      Actions.updateNodeAttributes(parentTabset.getId(), {enableDivide: false}),
    );
  }
};

export const removeSidePlaceholdersIfNeeded = (model: Model): void => {
  (Object.keys(PLACEHOLDER_TAB_IDS) as Side[]).forEach((side) => {
    const tabId = PLACEHOLDER_TAB_IDS[side];
    const placeholderTab: Node | undefined = model.getNodeById(tabId);
    const parentTabset: Node | undefined = placeholderTab?.getParent();
    if (!parentTabset) {
      return;
    }
    if (parentTabset.getChildren().some((tab: Node) => tab.getId() !== tabId)) {
      model.doAction(Actions.deleteTab(tabId));
      model.doAction(
        Actions.updateNodeAttributes(parentTabset.getId(), {
          enableDivide: true,
        }),
      );
    }
  });
};

export const createPanelCollapseLogic = (model: Model): (() => void) =>
  usePanelCollapseStore.subscribe((state, prevState) => {
    if (!model) {
      return;
    }
    const currentVisibility = getVisibility(state.panelStates);
    const previousVisibility = getVisibility(prevState.panelStates);
    const layoutJson = model.toJson() as LayoutJson;
    const {savedWeights} = usePanelCollapseStore.getState();

    for (const position of PANELS) {
      if (currentVisibility[position] === previousVisibility[position]) {
        continue;
      }
      const nodes = findPositionNodes(layoutJson, position);
      const collapse = !currentVisibility[position];

      // Tabset was deleted — insert a placeholder drop target instead of restoring
      // weights
      if (!collapse && !nodes.length) {
        ensureSidePlaceholder(model, position);
        continue;
      }

      // Skip dispatch when model already matches desired state.
      // This prevents re-entry: syncPanelStateFromModel → togglePanel → subscriber
      // fires
      const alreadyMatches = collapse
        ? nodes.every((node) => (node.weight ?? 0) < MINIMUM_VISIBLE_WEIGHT)
        : nodes.every((node) => (node.weight ?? 0) >= MINIMUM_VISIBLE_WEIGHT);

      if (alreadyMatches) {
        if (!collapse) {
          // Save current weights so they can be restored on next collapse
          nodes.forEach((node) => {
            const weight = node.weight ?? 0;
            if (node.id && weight >= MINIMUM_VISIBLE_WEIGHT) {
              savedWeights[node.id] = weight;
            }
          });
        }
        continue;
      }

      // Single traversal — collect weight changes and dispatch them together
      const updates: Array<[string, number]> = [];
      nodes.forEach((node) =>
        collapseNode(node, collapse, savedWeights, updates),
      );
      updates.forEach(([id, weight]) =>
        model.doAction(Actions.updateNodeAttributes(id, {weight})),
      );
    }
  });

export const syncPanelStateFromModel = (
  model: Model,
  projectId: string,
): void => {
  const layoutJson = model.toJson() as LayoutJson;
  const store = usePanelCollapseStore.getState();
  const currentState = store.panelStates[projectId] ?? DEFAULT_PANEL_STATE;

  for (const position of PANELS) {
    const nodes = findPositionNodes(layoutJson, position);
    const isVisibleInStore = currentState[position];
    const isPanelFullyVisible =
      nodes.length > 0 &&
      nodes.every((node) => (node.weight ?? 0) >= MINIMUM_VISIBLE_WEIGHT);
    const isEffectivelyHidden =
      nodes.every((node) => (node.weight ?? 0) < MINIMUM_VISIBLE_WEIGHT);

    // Toggle store if model and store disagree about panel visibility
    if (
      (isVisibleInStore && isEffectivelyHidden) ||
      (!isVisibleInStore && isPanelFullyVisible)
    ) {
      store.togglePanel(position, projectId);
    }
  }
};
