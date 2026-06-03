/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Mock flexlayout-react — only the Actions and DockLocation used by panel-collapse-manager
jest.mock('flexlayout-react', () => ({
  Actions: {
    addNode: (
      nodeJson: any,
      toNodeId: string,
      location: any,
      index: number,
    ) => ({
      data: {index, json: nodeJson, location, toNode: toNodeId},
      type: 'FlexLayout_AddNode',
    }),
    deleteTab: (id: string) => ({
      data: {node: id},
      type: 'FlexLayout_DeleteTab',
    }),
    updateNodeAttributes: (id: string, attributes: any) => ({
      data: {attributes, id},
      type: 'FlexLayout_UpdateNodeAttributes',
    }),
  },
  DockLocation: {LEFT: 'left', RIGHT: 'right'},
}));

import {
  createPanelCollapseLogic,
  DEFAULT_PANEL_STATE,
  removeSidePlaceholdersIfNeeded,
  syncPanelStateFromModel,
  usePanelCollapseStore,
} from '~features/panel-collapse';

const PROJECT_ID = 'test-project';

// Mock useProjectLayoutStore so getVisibility can resolve the active project
jest.mock('~shared/store/use-project-layout-store', () => ({
  useProjectLayoutStore: {
    getState: () => ({
      getActiveProjectGroup: () => ({mainTab: {id: PROJECT_ID}}),
    }),
  },
}));

// ─── Layout helpers ──────────────────────────────────────────────────────────

/** Standard 3-column layout: left tabset | center column | right tabset */
const makeLayout = ({
  bottomWeight = 20,
  hasLeftTabset = true,
  hasRightTabset = true,
  leftWeight = 20,
  rightWeight = 20,
} = {}) => ({
  layout: {
    children: [
      ...(hasLeftTabset
        ? [{children: [], id: 'left-ts', type: 'tabset', weight: leftWeight}]
        : []),
      {
        children: [
          {
            children: [],
            id: 'center-panel',
            type: 'tabset',
            weight: 80 - bottomWeight,
          },
          {children: [], id: 'bottom-ts', type: 'tabset', weight: bottomWeight},
        ],
        id: 'center-col',
        type: 'column',
        weight: 60,
      },
      ...(hasRightTabset
        ? [{children: [], id: 'right-ts', type: 'tabset', weight: rightWeight}]
        : []),
    ],
    id: 'root',
    type: 'row',
  },
});

// ─── Mock model ───────────────────────────────────────────────────────────────

/**
 * Stateful mock FlexLayout model.
 * Applies weight updates from doAction so toJson() reflects the current state.
 */
const createMockModel = (initialLayout: ReturnType<typeof makeLayout>) => {
  const layout = JSON.parse(JSON.stringify(initialLayout));
  const actions: any[] = [];

  const applyWeight = (node: any, id: string, weight: number): boolean => {
    if (node.id === id) {
      node.weight = weight;
      return true;
    }
    for (const child of node.children ?? []) {
      if (applyWeight(child, id, weight)) {
        return true;
      }
    }
    return false;
  };

  return {
    get actions() {
      return actions;
    },
    doAction: (action: any) => {
      actions.push(action);
      // Reflect weight changes so subsequent toJson() calls see the updated state
      const id = action?.data?.id ?? action?.data?.node;
      const weight = action?.data?.attributes?.weight ?? action?.data?.weight;
      if (id !== undefined && weight !== undefined) {
        applyWeight(layout.layout, id, weight);
      }
    },
    getNodeById: (_id: string) => null,
    getRoot: () => ({getId: () => 'root'}),
    toJson: () => JSON.parse(JSON.stringify(layout)),
  };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('panel-collapse-manager', () => {
  beforeEach(() => {
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {...DEFAULT_PANEL_STATE}},
      savedWeights: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Collapse → expand round-trip preserves saved weights ────────────────

  // Collapsing saves the original weight; expanding should restore it, not use the default
  it('saves original weight on collapse and restores it on expand', () => {
    const model = createMockModel(makeLayout({leftWeight: 30}));
    const unsubscribe = createPanelCollapseLogic(model as any);

    // Collapse left panel
    usePanelCollapseStore.getState().togglePanel('left', PROJECT_ID);

    expect(usePanelCollapseStore.getState().savedWeights['left-ts']).toBe(30);

    // Expand left panel — should restore weight 30, not the default 20
    usePanelCollapseStore.getState().togglePanel('left', PROJECT_ID);

    const expandAction = model.actions.find(
      (a) =>
        (a?.data?.id === 'left-ts' || a?.data?.node === 'left-ts') &&
        (a?.data?.attributes?.weight === 30 || a?.data?.weight === 30),
    );
    expect(expandAction).toBeDefined();

    unsubscribe();
  });

  // ── 2. Deleted tabset → expand inserts a placeholder ──────────────────────

  // When the tabset is gone, expanding should insert a drop-target placeholder instead
  it('inserts a placeholder when the left tabset has been deleted and panel is expanded', () => {
    // Layout with no left tabset (user deleted it)
    const model = createMockModel(makeLayout({hasLeftTabset: false}));

    // Store says left is collapsed — expanding should insert a placeholder
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: false, right: true}},
      savedWeights: {},
    });

    const addNodeActions: any[] = [];
    const modelWithAddNode = {
      ...model,
      doAction: (action: any) => {
        model.doAction(action);
        if (
          action?.type === 'FlexLayout_AddNode' ||
          JSON.stringify(action).includes('panel-placeholder')
        ) {
          addNodeActions.push(action);
        }
      },
      getNodeById: (_id: string) => null,
      getRoot: () => ({getId: () => 'root'}),
    };

    const unsubscribe = createPanelCollapseLogic(modelWithAddNode as any);

    // Expand left panel — no tabset exists, so a placeholder should be inserted
    usePanelCollapseStore.getState().togglePanel('left', PROJECT_ID);

    expect(addNodeActions.length).toBeGreaterThan(0);

    unsubscribe();
  });

  // ── 3. syncPanelStateFromModel toggles store when model disagrees ──────────

  // If the model shows a panel as open but the store says collapsed, sync the store
  it('toggles store to visible when model shows panel open but store says collapsed', () => {
    // Store says left is collapsed
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: false, right: true}},
      savedWeights: {},
    });

    // Model shows left panel as visible (weight > 0)
    const model = {toJson: () => makeLayout({leftWeight: 20})};

    syncPanelStateFromModel(model as any, PROJECT_ID);

    expect(usePanelCollapseStore.getState().panelStates[PROJECT_ID].left).toBe(
      true,
    );
  });

  // If the model shows a panel as collapsed (weight 0) but the store says visible, sync the store
  it('toggles store to collapsed when model shows panel at weight 0 but store says visible', () => {
    // Store says left is visible
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: true, right: true}},
      savedWeights: {},
    });

    // Model shows left panel as collapsed (weight 0)
    const model = {toJson: () => makeLayout({leftWeight: 0})};

    syncPanelStateFromModel(model as any, PROJECT_ID);

    expect(usePanelCollapseStore.getState().panelStates[PROJECT_ID].left).toBe(
      false,
    );
  });

  // ── 4. Stale/missing layout → syncPanelStateFromModel handles deleted tabsets ─

  // A layout with no side tabsets should not crash and should mark those panels as collapsed
  it('does not crash when layout has no side panel nodes and marks them as collapsed', () => {
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: true, right: true}},
      savedWeights: {},
    });

    // Layout with no left or right tabsets (stale/minimal schema — tabsets were deleted)
    // Bottom tabset is still present inside the center column
    const model = {
      toJson: () => ({
        layout: {
          children: [
            {
              children: [
                {children: [], id: 'center-panel', type: 'tabset', weight: 80},
                {children: [], id: 'bottom-ts', type: 'tabset', weight: 20},
              ],
              id: 'center-col',
              type: 'column',
              weight: 100,
            },
          ],
          id: 'root',
          type: 'row',
        },
      }),
    };

    expect(() =>
      syncPanelStateFromModel(model as any, PROJECT_ID),
    ).not.toThrow();

    // Deleted tabsets are treated as collapsed — store should reflect that
    const state = usePanelCollapseStore.getState().panelStates[PROJECT_ID];
    expect(state.left).toBe(false);
    expect(state.right).toBe(false);
    expect(state.bottom).toBe(true); // bottom panel still has nodes
  });

  // ── 5. removeSidePlaceholdersIfNeeded removes placeholder when real tab added ─

  // Once a real tab is dropped in, the placeholder should be removed and splitting re-enabled
  it('removes placeholder tab when a real tab is dropped into the tabset', () => {
    const PLACEHOLDER_ID = 'left-placeholder-tab';
    const removedTabs: string[] = [];
    const updatedNodes: string[] = [];

    const mockModel = {
      doAction: (action: any) => {
        const raw = JSON.stringify(action);
        if (raw.includes(PLACEHOLDER_ID)) {
          removedTabs.push(PLACEHOLDER_ID);
        }
        if (raw.includes('enableDivide')) {
          updatedNodes.push('left-placeholder-tabset');
        }
      },
      getNodeById: (id: string) => {
        if (id === PLACEHOLDER_ID) {
          return {
            getParent: () => ({
              getChildren: () => [
                {getId: () => PLACEHOLDER_ID},
                {getId: () => 'real-tab'}, // real tab was dropped in
              ],
              getId: () => 'left-placeholder-tabset',
            }),
          };
        }
        return null;
      },
    };

    removeSidePlaceholdersIfNeeded(mockModel as any);

    expect(removedTabs).toContain(PLACEHOLDER_ID);
    expect(updatedNodes).toContain('left-placeholder-tabset');
  });
});
