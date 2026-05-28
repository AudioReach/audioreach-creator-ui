/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Mock the legacy and revamp roots so the public-api barrel imports cleanly
// in a node test environment without pulling in QUI subpath modules
// (e.g. @qualcomm-ui/react/tabs) that the jest setup does not stub.
jest.mock('~features/usecase-visualizer/ui/usecase-visualizer-legacy', () => ({
  UsecaseVisualizerLegacy: () => null,
}));
jest.mock('~features/usecase-visualizer/ui/usecase-visualizer', () => ({
  UsecaseVisualizer: () => null,
}));

// eslint-disable-next-line import/first
import * as visualizerPublicApi from '~features/usecase-visualizer';

describe('usecase-visualizer public API — new exports', () => {
  it('exports NODE_DIMENSIONS and calculateModuleHeight', () => {
    expect(visualizerPublicApi.NODE_DIMENSIONS).toBeDefined();
    expect(typeof visualizerPublicApi.calculateModuleHeight).toBe('function');
  });

  it('exports the canonical const objects', () => {
    expect(visualizerPublicApi.NODE_KIND).toBeDefined();
    expect(visualizerPublicApi.EDGE_KIND).toBeDefined();
    expect(visualizerPublicApi.PORT_IO_TYPE).toBeDefined();
    expect(visualizerPublicApi.PORT_STATUS).toBeDefined();
    expect(visualizerPublicApi.MODULE_SHAPE).toBeDefined();
    expect(visualizerPublicApi.VISUALIZER_MODE).toBeDefined();
  });
});

describe('usecase-visualizer public API — internal symbols are not exported', () => {
  it('does not export createVisualizerStore, toReactFlow*, or SearchHighlightState', () => {
    const keys = Object.keys(visualizerPublicApi);
    expect(keys).not.toContain('createVisualizerStore');
    expect(keys).not.toContain('VisualizerInternalStore');
    expect(keys).not.toContain('toReactFlowNodes');
    expect(keys).not.toContain('toReactFlowEdges');
    expect(keys).not.toContain('SearchHighlightState');
  });
});

describe('usecase-visualizer public API — legacy exports preserved', () => {
  it('keeps legacy adapter and layout helpers', () => {
    expect(typeof visualizerPublicApi.buildGraphViewFromUsecase).toBe(
      'function',
    );
    expect(typeof visualizerPublicApi.layoutWithELK).toBe('function');
  });

  it('keeps legacy stores', () => {
    expect(visualizerPublicApi.useVisualizerSelectionStore).toBeDefined();
    expect(visualizerPublicApi.useSearchHighlightStore).toBeDefined();
  });

  it('keeps the legacy root component and its props alias', () => {
    expect(visualizerPublicApi.UsecaseVisualizerLegacy).toBeDefined();
  });
});

describe('usecase-visualizer public API — legacy type re-exports compile', () => {
  it('legacy and revamp types are importable as types', () => {
    type LegacyTypes = {
      container: visualizerPublicApi.RFContainerNodeData;
      edge: visualizerPublicApi.RFEdge;
      graphSpec: visualizerPublicApi.GraphSpec;
      graphView: visualizerPublicApi.GraphView;
      module: visualizerPublicApi.RFModuleNodeData;
      node: visualizerPublicApi.RFNode;
      nodeData: visualizerPublicApi.RFNodeData;
      search: visualizerPublicApi.SearchHighlight;
      subgraph: visualizerPublicApi.RFSubgraphNodeData;
      subsystem: visualizerPublicApi.RFSubsystemNodeData;
    };
    type LegacyRoot = {
      props: visualizerPublicApi.UsecaseVisualizerLegacyProps;
    };
    type RevampTypes = {
      anyEdge: visualizerPublicApi.AnyEdge;
      anyNode: visualizerPublicApi.AnyNode;
      level: visualizerPublicApi.LevelView;
    };
    const ok: LegacyTypes | LegacyRoot | RevampTypes | null = null;
    expect(ok).toBeNull();
  });
});
