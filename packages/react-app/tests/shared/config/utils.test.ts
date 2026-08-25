/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  Actions,
  DockLocation,
  Model,
  type IJsonModel,
  type IJsonTabNode,
  type IJsonTabSetNode,
} from 'flexlayout-react';

import {
  BOTTOM_TABSET_ID,
  CENTER_TABSET_ID,
  getFlexLayoutGlobalConfig,
  KEY_CONFIGURATOR_COMPONENT_NAME,
  LEFT_TABSET_ID,
  LOG_VIEW_COMPONENT_NAME,
  migrateFlexLayoutConfig,
  MODULE_LIST_COMPONENT_NAME,
  PLACEHOLDER_COMPONENT_NAME,
  RIGHT_TABSET_ID,
  ROOT_LAYOUT_ID,
  SUBGRAPH_LIST_COMPONENT_NAME,
  VALIDATION_RESULTS_COMPONENT_NAME,
} from '~shared/config/utils';

jest.mock('~shared/lib/logger');

function tab(id: string, component: string): IJsonTabNode {
  return {component, id, name: id, type: 'tab'};
}

function tabset(id: string, children: IJsonTabNode[]): IJsonTabSetNode {
  return {children, id, type: 'tabset', weight: 20};
}

// Mirrors GetFlexLayoutConfig()'s current shape: root > topRow (left column +
// center + right) and bottomRow, with left holding Module List + Subgraph List.
function layout(overrides?: {
  bottom?: IJsonTabNode[];
  center?: IJsonTabNode[];
  left?: IJsonTabNode[];
  right?: IJsonTabNode[];
}): IJsonModel {
  const left = overrides?.left ?? [
    tab(MODULE_LIST_COMPONENT_NAME, MODULE_LIST_COMPONENT_NAME),
    tab(SUBGRAPH_LIST_COMPONENT_NAME, SUBGRAPH_LIST_COMPONENT_NAME),
  ];
  const center = overrides?.center ?? [tab('graph-designer', 'graph-designer')];
  const right = overrides?.right ?? [
    tab(KEY_CONFIGURATOR_COMPONENT_NAME, KEY_CONFIGURATOR_COMPONENT_NAME),
  ];
  const bottom = overrides?.bottom ?? [
    tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME),
    tab(VALIDATION_RESULTS_COMPONENT_NAME, VALIDATION_RESULTS_COMPONENT_NAME),
  ];

  return {
    borders: [],
    layout: {
      children: [
        {
          children: [
            tabset(LEFT_TABSET_ID, left),
            tabset(CENTER_TABSET_ID, center),
            tabset(RIGHT_TABSET_ID, right),
          ],
          id: 'top-row',
          type: 'row',
        },
        tabset(BOTTOM_TABSET_ID, bottom),
      ],
      id: ROOT_LAYOUT_ID,
      type: 'row',
    },
  };
}

function findTabset(result: IJsonModel, tabsetId: string): IJsonTabSetNode {
  const stack = [...result.layout.children];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if ('id' in node && node.id === tabsetId && node.type === 'tabset') {
      return node;
    }
    if ('children' in node) {
      stack.push(...node.children);
    }
  }
  throw new Error(`tabset "${tabsetId}" not found`);
}

describe('migrateFlexLayoutConfig', () => {
  it('removes a tabset when its last tab is moved to another tabset', () => {
    const savedLayout = layout();
    const topRow = savedLayout.layout.children[0];
    if (topRow.type !== 'row') {
      throw new Error('expected top row');
    }
    topRow.children = [
      {
        children: [tab(MODULE_LIST_COMPONENT_NAME, MODULE_LIST_COMPONENT_NAME)],
        id: LEFT_TABSET_ID,
        type: 'tabset',
      },
      {
        children: [tab(SUBGRAPH_LIST_COMPONENT_NAME, SUBGRAPH_LIST_COMPONENT_NAME)],
        type: 'tabset',
      },
      ...topRow.children.slice(1),
    ];
    const model = Model.fromJson({
      ...savedLayout,
      global: getFlexLayoutGlobalConfig({tabSetEnableClose: false}),
    });

    model.doAction(
      Actions.moveNode(
        SUBGRAPH_LIST_COMPONENT_NAME,
        RIGHT_TABSET_ID,
        DockLocation.CENTER,
        -1,
        true,
      ),
    );

    const result = model.toJson();
    const updatedTopRow = result.layout.children[0];
    if (updatedTopRow.type !== 'row') {
      throw new Error('expected top row');
    }
    const leftTabsets = updatedTopRow.children
      .filter((node) => node.type === 'tabset' && node.id !== CENTER_TABSET_ID);

    expect(leftTabsets).toHaveLength(2);
    expect(
      leftTabsets.some(
        (node) => node.type === 'tabset' && node.children?.length === 0,
      ),
    ).toBe(false);
  });

  // No-op when the saved layout already has every default tab.
  it('returns the same object reference when the saved layout already matches the default', () => {
    const savedLayout = layout();

    const result = migrateFlexLayoutConfig(savedLayout);

    expect(result).toBe(savedLayout);
  });

  // A tab added to GetFlexLayoutConfig() shows up in an old saved layout.
  it('adds a default tab missing from the saved layout', () => {
    const savedLayout = layout({
      bottom: [tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME)],
    });

    const result = migrateFlexLayoutConfig(savedLayout);
    const bottomTabset = findTabset(result, BOTTOM_TABSET_ID);

    expect(bottomTabset.children.map((t) => t.id)).toContain(
      VALIDATION_RESULTS_COMPONENT_NAME,
    );
  });

  // A hand-edited tab with an unrecognized component gets stripped out.
  it('removes a tab whose component the app cannot write itself', () => {
    const savedLayout = layout({
      bottom: [
        tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME),
        tab(
          VALIDATION_RESULTS_COMPONENT_NAME,
          VALIDATION_RESULTS_COMPONENT_NAME,
        ),
        tab('fake-tab', 'hand-edited-fake'),
      ],
    });

    const result = migrateFlexLayoutConfig(savedLayout);
    const bottomTabset = findTabset(result, BOTTOM_TABSET_ID);

    expect(bottomTabset.children.map((t) => t.id)).toEqual([
      LOG_VIEW_COMPONENT_NAME,
      VALIDATION_RESULTS_COMPONENT_NAME,
    ]);
  });

  // A tab missing a component entirely is treated as hand-edited and stripped.
  it('removes a tab with no component at all', () => {
    const savedLayout = layout({
      bottom: [
        tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME),
        tab(
          VALIDATION_RESULTS_COMPONENT_NAME,
          VALIDATION_RESULTS_COMPONENT_NAME,
        ),
        {id: 'no-component', name: 'No Component', type: 'tab'},
      ],
    });

    const result = migrateFlexLayoutConfig(savedLayout);
    const bottomTabset = findTabset(result, BOTTOM_TABSET_ID);

    expect(bottomTabset.children.map((t) => t.id)).toEqual([
      LOG_VIEW_COMPONENT_NAME,
      VALIDATION_RESULTS_COMPONENT_NAME,
    ]);
  });

  // A hand-edited tab reusing a real component under a fake id is still stale.
  it('removes a tab whose component is recognized but whose id is not a real default id', () => {
    const savedLayout = layout({
      right: [
        tab(KEY_CONFIGURATOR_COMPONENT_NAME, KEY_CONFIGURATOR_COMPONENT_NAME),
        tab('faketab1', KEY_CONFIGURATOR_COMPONENT_NAME),
      ],
    });

    const result = migrateFlexLayoutConfig(savedLayout);
    const rightTabset = findTabset(result, RIGHT_TABSET_ID);

    expect(rightTabset.children.map((t) => t.id)).toEqual([
      KEY_CONFIGURATOR_COMPONENT_NAME,
    ]);
  });

  // Regression: a tab dragged to a different tabset must not get duplicated.
  it('does not duplicate a tab that was moved to a different tabset (regression)', () => {
    const savedLayout = layout({
      bottom: [tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME)],
      right: [
        tab(KEY_CONFIGURATOR_COMPONENT_NAME, KEY_CONFIGURATOR_COMPONENT_NAME),
        tab(
          VALIDATION_RESULTS_COMPONENT_NAME,
          VALIDATION_RESULTS_COMPONENT_NAME,
        ),
      ],
    });

    const result = migrateFlexLayoutConfig(savedLayout);

    const allTabIds = [
      BOTTOM_TABSET_ID,
      RIGHT_TABSET_ID,
      LEFT_TABSET_ID,
    ].flatMap((id) => findTabset(result, id).children.map((t) => t.id));
    expect(
      allTabIds.filter((id) => id === VALIDATION_RESULTS_COMPONENT_NAME),
    ).toHaveLength(1);

    const rightTabset = findTabset(result, RIGHT_TABSET_ID);
    expect(rightTabset.children.map((t) => t.id)).toContain(
      VALIDATION_RESULTS_COMPONENT_NAME,
    );
  });

  // A dynamically-inserted placeholder tab is left alone, not treated as
  // stale, and a missing default tab is reinserted alongside it.
  it('keeps a dynamically-inserted placeholder tab', () => {
    const savedLayout = layout({
      right: [tab('right-placeholder-tab', PLACEHOLDER_COMPONENT_NAME)],
    });

    const result = migrateFlexLayoutConfig(savedLayout);
    const rightTabset = findTabset(result, RIGHT_TABSET_ID);

    expect(rightTabset.children.map((t) => t.id)).toContain(
      'right-placeholder-tab',
    );
    expect(rightTabset.children.map((t) => t.id)).toContain(
      KEY_CONFIGURATOR_COMPONENT_NAME,
    );
  });

  // A saved layout missing an entire default tabset doesn't throw.
  it('does not throw when a default tabset is missing entirely from the saved layout', () => {
    const savedLayout: IJsonModel = {
      borders: [],
      layout: {
        children: [
          tabset(LEFT_TABSET_ID, [tab('graph-designer', 'graph-designer')]),
        ],
        id: ROOT_LAYOUT_ID,
        type: 'row',
      },
    };

    expect(() => migrateFlexLayoutConfig(savedLayout)).not.toThrow();
  });

  // Removing the tab a tabset had selected must not leave `selected` pointing
  // past the end of the array (FlexLayout would show a blank content area).
  it("resets a tabset's selected index when the selected tab is removed as stale", () => {
    const savedLayout = layout({
      bottom: [
        tab(LOG_VIEW_COMPONENT_NAME, LOG_VIEW_COMPONENT_NAME),
        tab(
          VALIDATION_RESULTS_COMPONENT_NAME,
          VALIDATION_RESULTS_COMPONENT_NAME,
        ),
        tab('fake-tab', 'hand-edited-fake'),
      ],
    });
    const bottomTabset = findTabset(savedLayout, BOTTOM_TABSET_ID);
    bottomTabset.selected = 2; // points at the fake tab, which gets removed

    const result = migrateFlexLayoutConfig(savedLayout);
    const migratedBottomTabset = findTabset(result, BOTTOM_TABSET_ID);

    expect(migratedBottomTabset.selected).toBe(0);
  });
});
