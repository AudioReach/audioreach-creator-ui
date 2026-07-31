/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~features/graph-designer/lib/dev-mode', () => ({
  isDevMode: jest.fn(() => true),
}));

jest.mock('~features/graph-designer/model/module-list-slice', () => ({
  ...jest.requireActual('~features/graph-designer/model/module-list-slice'),
  evictModuleListFilterCache: jest.fn(),
}));

jest.mock('~features/graph-designer/model/subgraph-list-slice', () => ({
  ...jest.requireActual('~features/graph-designer/model/subgraph-list-slice'),
  evictSubgraphListFilterCache: jest.fn(),
}));

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: any) => children,
    Description: ({children}: any) => children,
    FloatingPortal: ({children}: any) => children,
    Footer: ({children}: any) => children,
    Heading: ({children}: any) => children,
    IndicatorIcon: () => null,
    Root: ({children, open}: any) => (open ? children : null),
  },
}));

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: () => null,
  RadioGroup: {Items: ({children}: any) => children, Root: () => null},
}));

import {evictModuleListFilterCache} from '~features/graph-designer/model/module-list-slice';
import {evictSubgraphListFilterCache} from '~features/graph-designer/model/subgraph-list-slice';
import {tabStoreRegistry} from '~shared/store/tab-store-registry';

// Importing the barrel registers the 'graph-designer' factory as a
// module-scope side effect.
import '~features/graph-designer';

const mockEvictModuleListFilterCache = jest.mocked(evictModuleListFilterCache);
const mockEvictSubgraphListFilterCache = jest.mocked(
  evictSubgraphListFilterCache,
);

const TAB_ID = 'tab-1';
const PROJECT_ID = 'proj-1';

interface WindowWithGraphStore {
  __graphStore?: Record<string, unknown>;
}

describe('graph-designer tab-store factory — dev handle', () => {
  afterEach(() => {
    delete (window as WindowWithGraphStore).__graphStore;
  });

  it('attaches the created store to window.__graphStore under the tabId', () => {
    const store = tabStoreRegistry.createTabStore(
      TAB_ID,
      'graph-designer',
      PROJECT_ID,
    );

    expect((window as WindowWithGraphStore).__graphStore?.[TAB_ID]).toBe(store);
  });

  it('removes the dev handle and still runs both filter-cache evictions on destroyTabStore', () => {
    tabStoreRegistry.createTabStore(TAB_ID, 'graph-designer', PROJECT_ID);

    tabStoreRegistry.destroyTabStore(TAB_ID);

    expect(
      (window as WindowWithGraphStore).__graphStore?.[TAB_ID],
    ).toBeUndefined();
    expect(mockEvictModuleListFilterCache).toHaveBeenCalledWith(PROJECT_ID);
    expect(mockEvictSubgraphListFilterCache).toHaveBeenCalledWith(PROJECT_ID);
  });
});
