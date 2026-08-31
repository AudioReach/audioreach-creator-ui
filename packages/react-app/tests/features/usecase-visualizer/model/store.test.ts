/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import type {
  SearchHighlights,
  VisualizerEventHandlers,
} from '~features/usecase-visualizer/model/visualizer.types';

describe('createVisualizerStore — instances are isolated', () => {
  it('returns a fresh store on every call with independent state', () => {
    const a = createVisualizerStore();
    const b = createVisualizerStore();

    a.getState().setLodZoom(0.5);
    b.getState().setLodZoom(2);

    expect(a.getState().lodZoom).toBe(0.5);
    expect(b.getState().lodZoom).toBe(2);
  });

  it('seeds default state values', () => {
    const store = createVisualizerStore();
    const state = store.getState();
    expect(state.selection).toEqual({
      selectedEdges: [],
      selectedNodes: [],
    });
    expect(state.hoverState).toEqual({
      hoveredLogicalContainerId: null,
      hoveredNodeId: null,
    });
    expect(state.viewportCache).toEqual({});
    expect(state.searchHighlightById).toEqual({});
    expect(state.containsMatchNodeIds).toEqual([]);
  });
});

describe('createVisualizerStore — setSelection / clearSelection', () => {
  it('setSelection records selected entity refs', () => {
    const store = createVisualizerStore();
    store.getState().setSelection(
      [{id: 'n1', nodeKind: 'module', systemId: 'sys-n1'}],
      [{edgeKind: 'control', id: 'e1', systemId: 'sys-e1'}],
    );
    expect(store.getState().selection).toEqual({
      selectedEdges: [{edgeKind: 'control', id: 'e1', systemId: 'sys-e1'}],
      selectedNodes: [{id: 'n1', nodeKind: 'module', systemId: 'sys-n1'}],
    });

    store
      .getState()
      .setSelection([{id: 'n2', nodeKind: 'module', systemId: 'sys-n2'}], []);
    expect(store.getState().selection).toEqual({
      selectedEdges: [],
      selectedNodes: [{id: 'n2', nodeKind: 'module', systemId: 'sys-n2'}],
    });
  });

  it('clearSelection resets selection', () => {
    const store = createVisualizerStore();
    store.getState().setSelection(
      [
        {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
        {id: 'n2', nodeKind: 'module', systemId: 'sys-n2'},
      ],
      [{edgeKind: 'control', id: 'e1', systemId: 'sys-e1'}],
    );
    store.getState().clearSelection();
    expect(store.getState().selection).toEqual({
      selectedEdges: [],
      selectedNodes: [],
    });
  });
});

describe('createVisualizerStore — setHoverState', () => {
  it('updates both hover fields together', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('n1', 'logical-1');
    expect(store.getState().hoverState).toEqual({
      hoveredLogicalContainerId: 'logical-1',
      hoveredNodeId: 'n1',
    });
  });

  it('null/null clears both fields', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('n1', 'logical-1');
    store.getState().setHoverState(null, null);
    expect(store.getState().hoverState).toEqual({
      hoveredLogicalContainerId: null,
      hoveredNodeId: null,
    });
  });
});

describe('createVisualizerStore — setLodZoom', () => {
  it('updates lodZoom', () => {
    const store = createVisualizerStore();
    store.getState().setLodZoom(0.3);
    expect(store.getState().lodZoom).toBe(0.3);
  });
});

describe('createVisualizerStore — setViewportCache', () => {
  it('stores viewport keyed by levelId without overwriting existing entries', () => {
    const store = createVisualizerStore();
    store.getState().setViewportCache('A', {x: 1, y: 2, zoom: 1});
    store.getState().setViewportCache('B', {x: 3, y: 4, zoom: 2});
    expect(store.getState().viewportCache).toEqual({
      A: {x: 1, y: 2, zoom: 1},
      B: {x: 3, y: 4, zoom: 2},
    });
  });

  it('replaces an existing entry when called twice with the same levelId', () => {
    const store = createVisualizerStore();
    store.getState().setViewportCache('A', {x: 1, y: 2, zoom: 1});
    store.getState().setViewportCache('A', {x: 9, y: 9, zoom: 9});
    expect(store.getState().viewportCache.A).toEqual({x: 9, y: 9, zoom: 9});
  });
});

describe('createVisualizerStore — syncSearchHighlights', () => {
  it('mirrors active and matched ids into searchHighlightById', () => {
    const store = createVisualizerStore();
    const highlights: SearchHighlights = {
      activeId: 'n1',
      containsMatchNodeIds: ['s1'],
      highlightedIds: ['n1', 'n2', 'n3'],
    };
    store.getState().syncSearchHighlights(highlights);
    expect(store.getState().searchHighlightById).toEqual({
      n1: 'active',
      n2: 'match',
      n3: 'match',
    });
    expect(store.getState().containsMatchNodeIds).toEqual(['s1']);
  });

  it('marks every highlighted id as match when no activeId is set', () => {
    const store = createVisualizerStore();
    store.getState().syncSearchHighlights({
      highlightedIds: ['a', 'b'],
    });
    expect(store.getState().searchHighlightById).toEqual({
      a: 'match',
      b: 'match',
    });
    expect(store.getState().containsMatchNodeIds).toEqual([]);
  });

  it('clears state when called with undefined', () => {
    const store = createVisualizerStore();
    store.getState().syncSearchHighlights({
      activeId: 'n1',
      containsMatchNodeIds: ['s1'],
      highlightedIds: ['n1'],
    });
    store.getState().syncSearchHighlights(undefined);
    expect(store.getState().searchHighlightById).toEqual({});
    expect(store.getState().containsMatchNodeIds).toEqual([]);
  });
});

describe('createVisualizerStore — clearHoverStateIfNode', () => {
  it('clears hover state when the given nodeId matches the hovered node', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('n1', 'lc-1');
    store.getState().clearHoverStateIfNode('n1');
    expect(store.getState().hoverState).toEqual({
      hoveredLogicalContainerId: null,
      hoveredNodeId: null,
    });
  });

  it('does not clear hover state when the given nodeId does not match', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('n2', 'lc-2');
    store.getState().clearHoverStateIfNode('n1');
    expect(store.getState().hoverState).toEqual({
      hoveredLogicalContainerId: 'lc-2',
      hoveredNodeId: 'n2',
    });
  });
});

describe('createVisualizerStore — setEventHandlers', () => {
  it('defaults eventHandlers to undefined', () => {
    const store = createVisualizerStore();
    expect(store.getState().eventHandlers).toBeUndefined();
  });

  it('stores the passed handlers object', () => {
    const store = createVisualizerStore();
    const handlers: VisualizerEventHandlers = {
      onNodeDoubleClick: jest.fn(),
      onSubgraphCollapse: jest.fn(),
    };
    store.getState().setEventHandlers(handlers);
    expect(store.getState().eventHandlers).toBe(handlers);
  });

  it('clears handlers when called with undefined', () => {
    const store = createVisualizerStore();
    store.getState().setEventHandlers({onSubgraphExpand: jest.fn()});
    store.getState().setEventHandlers(undefined);
    expect(store.getState().eventHandlers).toBeUndefined();
  });
});
