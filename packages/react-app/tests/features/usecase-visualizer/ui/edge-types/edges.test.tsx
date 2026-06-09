/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {render} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {DATA_ARROW_MARKER_ID} from '~features/usecase-visualizer/lib/edge-stroke';
import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import {ControlLinkEdge} from '~features/usecase-visualizer/ui/edge-types/control-link-edge';
import {DataLinkEdge} from '~features/usecase-visualizer/ui/edge-types/data-link-edge';

import {makeEdgeProps} from './edge-props';

jest.mock('@xyflow/react', () => {
  const actual: Record<string, unknown> = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    EdgeLabelRenderer: ({children}: {children: ReactNode}) => <>{children}</>,
  };
});

interface RenderEdgeOptions {
  lodThreshold?: number;
  lodZoom?: number;
}

function renderEdge(component: ReactNode, options: RenderEdgeOptions = {}) {
  const store = createVisualizerStore();
  if (options.lodThreshold !== undefined) {
    store.getState().setRenderingConfig({lodThreshold: options.lodThreshold});
  }
  if (options.lodZoom !== undefined) {
    store.getState().setLodZoom(options.lodZoom);
  }
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <svg>{component}</svg>
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

function findEdgePath(container: HTMLElement): SVGPathElement {
  const path = container.querySelector<SVGPathElement>(
    'path.react-flow__edge-path',
  );
  if (!path) {
    throw new Error('edge path not rendered');
  }
  return path;
}

describe('DataLinkEdge', () => {
  it('renders an SVG path', () => {
    const {container} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1'})} />,
    );
    const path = findEdgePath(container);
    expect(path.getAttribute('d')).toBeTruthy();
  });

  it('references the hoisted data arrow marker on the path', () => {
    const {container} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1'})} />,
    );
    const path = findEdgePath(container);
    expect(path.getAttribute('marker-end')).toBe(
      `url(#${DATA_ARROW_MARKER_ID})`,
    );
  });

  it('uses default stroke width 2 and neutral stroke', () => {
    const {container} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1'})} />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('2');
    expect(path.style.stroke).toContain('--color-border-neutral-10');
  });

  it('uses stroke width 3 and selected stroke when selected', () => {
    const {container} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1', selected: true})} />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('3');
    expect(path.style.stroke).toContain('--color-border-support-info');
  });

  it('renders the label above the bezier midpoint when label is set', () => {
    const {getByTestId} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1', label: 'amp-out'})} />,
      {lodThreshold: 0.4, lodZoom: 1},
    );
    const label = getByTestId('edge-label-d1');
    expect(label).toHaveTextContent('amp-out');
  });

  it('hides the label when lodZoom is below lodThreshold', () => {
    const {queryByTestId} = renderEdge(
      <DataLinkEdge {...makeEdgeProps({id: 'd1', label: 'amp-out'})} />,
      {lodThreshold: 0.5, lodZoom: 0.2},
    );
    expect(queryByTestId('edge-label-d1')).toBeNull();
  });
});

describe('ControlLinkEdge', () => {
  it('renders a dashed path with no arrow marker', () => {
    const {container} = renderEdge(
      <ControlLinkEdge {...makeEdgeProps({id: 'c1'})} />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeDasharray).toBe('5 5');
    expect(path.getAttribute('marker-end')).toBeNull();
  });

  it('uses default stroke width 2 when not selected', () => {
    const {container} = renderEdge(
      <ControlLinkEdge {...makeEdgeProps({id: 'c1'})} />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('2');
  });

  it('uses stroke width 3 and selected stroke when selected', () => {
    const {container} = renderEdge(
      <ControlLinkEdge {...makeEdgeProps({id: 'c1', selected: true})} />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('3');
    expect(path.style.stroke).toContain('--color-border-support-info');
  });

  it('renders the label when set', () => {
    const {getByTestId} = renderEdge(
      <ControlLinkEdge {...makeEdgeProps({id: 'c1', label: 'gate'})} />,
      {lodThreshold: 0.4, lodZoom: 1},
    );
    expect(getByTestId('edge-label-c1')).toHaveTextContent('gate');
  });

  it('hides the label when lodZoom is below lodThreshold', () => {
    const {queryByTestId} = renderEdge(
      <ControlLinkEdge {...makeEdgeProps({id: 'c2', label: 'gate'})} />,
      {lodThreshold: 0.5, lodZoom: 0.1},
    );
    expect(queryByTestId('edge-label-c2')).toBeNull();
  });
});

describe('proxy edge variants', () => {
  it('DataLinkEdge with edgeKind=proxy-data renders default stroke width (2)', () => {
    const {container} = renderEdge(
      <DataLinkEdge
        {...makeEdgeProps({
          data: {edgeKind: 'proxy-data'},
          id: 'pd1',
        })}
      />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('2');
    expect(path.getAttribute('marker-end')).toBe(
      `url(#${DATA_ARROW_MARKER_ID})`,
    );
  });

  it('ControlLinkEdge with edgeKind=proxy-control renders default stroke width (2) and stays dashed', () => {
    const {container} = renderEdge(
      <ControlLinkEdge
        {...makeEdgeProps({
          data: {edgeKind: 'proxy-control'},
          id: 'pc1',
        })}
      />,
    );
    const path = findEdgePath(container);
    expect(path.style.strokeWidth).toBe('2');
    expect(path.style.strokeDasharray).toBe('5 5');
    expect(path.getAttribute('marker-end')).toBeNull();
  });
});
