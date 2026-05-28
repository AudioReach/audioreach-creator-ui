/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import type {SearchHighlights} from '~features/usecase-visualizer/model/visualizer.types';

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
      selectedEdgeIds: [],
      selectedNodeIds: [],
    });
    expect(state.previousSelection).toEqual({
      selectedEdgeIds: [],
      selectedNodeIds: [],
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
  it('setSelection records new ids and moves previous into previousSelection', () => {
    const store = createVisualizerStore();
    store.getState().setSelection(['n1'], ['e1']);
    expect(store.getState().selection).toEqual({
      selectedEdgeIds: ['e1'],
      selectedNodeIds: ['n1'],
    });
    expect(store.getState().previousSelection).toEqual({
      selectedEdgeIds: [],
      selectedNodeIds: [],
    });

    store.getState().setSelection(['n2'], []);
    expect(store.getState().selection).toEqual({
      selectedEdgeIds: [],
      selectedNodeIds: ['n2'],
    });
    expect(store.getState().previousSelection).toEqual({
      selectedEdgeIds: ['e1'],
      selectedNodeIds: ['n1'],
    });
  });

  it('clearSelection resets selection and stores the previous value', () => {
    const store = createVisualizerStore();
    store.getState().setSelection(['n1', 'n2'], ['e1']);
    store.getState().clearSelection();
    expect(store.getState().selection).toEqual({
      selectedEdgeIds: [],
      selectedNodeIds: [],
    });
    expect(store.getState().previousSelection).toEqual({
      selectedEdgeIds: ['e1'],
      selectedNodeIds: ['n1', 'n2'],
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
