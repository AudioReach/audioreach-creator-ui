/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~features/usecase-visualizer/ui/usecase-visualizer', () => ({
  UsecaseVisualizer: () => null,
}));

import * as visualizerPublicApi from '~features/usecase-visualizer';

describe('usecase-visualizer public API — core exports', () => {
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

  it('exports UsecaseVisualizer and it is defined', () => {
    expect(visualizerPublicApi.UsecaseVisualizer).toBeDefined();
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
