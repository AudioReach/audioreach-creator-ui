/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const genericTreeViewMock = jest.fn();

jest.mock('~features/generic-tree-view', () => ({
  GenericTreeView: (props: unknown) => {
    genericTreeViewMock(props);
    return <div data-testid="generic-tree-view" />;
  },
}));

import {render, screen} from '@testing-library/react';

import type {TreeViewData} from '~features/generic-tree-view';
import {SchemaPropertiesTree} from '~widgets/properties-panel/ui/shared/schema-properties-tree';

const data: TreeViewData = {
  items: [
    {
      elements: [],
      id: '32',
      name: 'Scenario',
    },
  ],
  systemId: 'sg-1',
};

describe('SchemaPropertiesTree', () => {
  beforeEach(() => {
    genericTreeViewMock.mockClear();
  });

  it('renders loading, empty, and error states', () => {
    const retry = jest.fn();
    const {rerender} = render(
      <SchemaPropertiesTree
        data={null}
        error={null}
        isEditing
        isLoading
        onCommit={jest.fn()}
        onRetry={retry}
        title="Schema Properties"
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    rerender(
      <SchemaPropertiesTree
        data={{items: [], systemId: 'sg-1'}}
        error={null}
        isEditing
        isLoading={false}
        onCommit={jest.fn()}
        onRetry={retry}
        title="Schema Properties"
      />,
    );
    expect(screen.getByText('No schema properties')).toBeInTheDocument();

    rerender(
      <SchemaPropertiesTree
        data={null}
        error="Load failed"
        isEditing
        isLoading={false}
        onCommit={jest.fn()}
        onRetry={retry}
        title="Schema Properties"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
  });

  it('forwards hidden-toolbar defaults to GenericTreeView', () => {
    const onCommit = jest.fn();
    render(
      <SchemaPropertiesTree
        data={data}
        error={null}
        isEditing={false}
        isLoading={false}
        onCommit={onCommit}
        onRetry={jest.fn()}
        title="Schema Properties"
      />,
    );

    expect(genericTreeViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        autoCommit: {onCommit},
        data,
        defaultPolicyFilter: ['BASIC', 'ADVANCED'],
        defaultViewMode: 'legacy',
        hideToolbar: true,
        readOnly: true,
        title: 'Schema Properties',
      }),
    );
  });
});
