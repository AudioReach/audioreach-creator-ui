/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {GhostNode} from '~features/usecase-visualizer/lib/ghost-node';
import type {
  ContainerNode,
  ModuleNode,
} from '~features/usecase-visualizer/model/visualizer.types';

function makeModule(overrides: Partial<ModuleNode> = {}): ModuleNode {
  return {
    height: 100,
    id: 'm-1',
    label: 'Module 1',
    moduleId: 7,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeContainer(overrides: Partial<ContainerNode> = {}): ContainerNode {
  return {
    containerId: 1,
    height: 100,
    id: 'c-1',
    label: 'Container A',
    nodeKind: 'container',
    width: 200,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function renderGhost(node: Parameters<typeof GhostNode>[0]['node']) {
  return render(
    <ReactFlowProvider>
      <GhostNode node={node} />
    </ReactFlowProvider>,
  );
}

describe('GhostNode', () => {
  it('renders node label once', () => {
    renderGhost(makeModule({label: 'Custom Label'}));
    expect(screen.getAllByText('Custom Label')).toHaveLength(1);
  });

  it('applies declared width and height', () => {
    renderGhost(makeModule({height: 120, width: 180}));
    const ghost = screen.getByTestId('ghost-node');
    expect(ghost.style.width).toBe('180px');
    expect(ghost.style.height).toBe('120px');
  });

  it('renders one Handle per data input/output and two per control port', () => {
    const node = makeModule({
      height: 100,
      ports: [
        {id: 'p-in-1', portIoType: 'input'},
        {id: 'p-in-2', portIoType: 'input'},
        {id: 'p-out-1', portIoType: 'output'},
        {id: 'p-ctrl-1', portIoType: 'control'},
      ],
    });
    const {container} = renderGhost(node);
    const handles = container.querySelectorAll('[data-handleid]');
    const ids = Array.from(handles).map((h) => h.getAttribute('data-handleid'));
    expect(ids.sort()).toEqual(
      [
        'Control:p-ctrl-1-source',
        'Control:p-ctrl-1-target',
        'Data:p-in-1',
        'Data:p-in-2',
        'Data:p-out-1',
      ].sort(),
    );
  });

  it('marks handles invisible and non-interactive', () => {
    const node = makeModule({
      ports: [{id: 'p1', portIoType: 'input'}],
    });
    const {container} = renderGhost(node);
    const handle = container.querySelector('[data-handleid="Data:p1"]');
    expect(handle).not.toBeNull();
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    expect(handle?.className).toContain('pointer-events-none');
    expect(handle?.className).toContain('opacity-0');
  });

  it('renders no Handle elements for kinds without ports (Container)', () => {
    const {container} = renderGhost(makeContainer());
    expect(container.querySelectorAll('[data-handleid]')).toHaveLength(0);
  });
});
