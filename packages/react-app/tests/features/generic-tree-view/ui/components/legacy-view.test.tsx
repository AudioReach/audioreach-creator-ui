/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';

import type {TreeViewItem} from '~features/generic-tree-view/model/tree-view-data';
import {LegacyView} from '~features/generic-tree-view/ui/components/legacy-view';

jest.mock('~shared/lib/logger');

function makeItem(id: string): TreeViewItem {
  return {elements: [], id, name: id};
}

function makeSingleElementItem(id: string): TreeViewItem {
  return {
    elements: [
      {
        dataType: 'Int32',
        isReadOnly: false,
        name: id,
        type: 'ConfigElement',
        value: '10',
      },
    ],
    id,
    name: id,
  };
}

describe('LegacyView status strip counts', () => {
  it('dedups multiple dirty element paths under one parameter to a single count', () => {
    render(
      <LegacyView
        arrayCounts={new Map()}
        committedValues={new Map()}
        dirtyPaths={new Set(['param1/elemA', 'param1/elemB'])}
        elementValues={new Map()}
        expandedKeys={[]}
        invalidPaths={new Set()}
        items={[makeItem('param1'), makeItem('param2')]}
        matchSets={null}
        moduleName="mod"
        onExpandedChange={jest.fn()}
        onValueChange={jest.fn()}
        policyFilter={new Set(['BASIC', 'ADVANCED'])}
        readOnly={false}
        resetKey={0}
        setPaths={new Set()}
        showRanges={false}
      />,
    );
    expect(screen.getByText(/1.*dirty/i)).toBeInTheDocument();
  });

  it('dedups multiple set element paths under one parameter to a single count', () => {
    render(
      <LegacyView
        arrayCounts={new Map()}
        committedValues={new Map()}
        dirtyPaths={new Set()}
        elementValues={new Map()}
        expandedKeys={[]}
        invalidPaths={new Set()}
        items={[makeItem('param1'), makeItem('param2')]}
        matchSets={null}
        moduleName="mod"
        onExpandedChange={jest.fn()}
        onValueChange={jest.fn()}
        policyFilter={new Set(['BASIC', 'ADVANCED'])}
        readOnly={false}
        resetKey={0}
        setPaths={new Set(['param1/elemA', 'param1/elemB', 'param1/elemC'])}
        showRanges={false}
      />,
    );
    expect(screen.getByText(/1.*set/i)).toBeInTheDocument();
  });

  it('counts distinct parameters, not distinct element paths', () => {
    render(
      <LegacyView
        arrayCounts={new Map()}
        committedValues={new Map()}
        dirtyPaths={new Set(['param1/elemA', 'param2/elemB', 'param2/elemC'])}
        elementValues={new Map()}
        expandedKeys={[]}
        invalidPaths={new Set()}
        items={[makeItem('param1'), makeItem('param2')]}
        matchSets={null}
        moduleName="mod"
        onExpandedChange={jest.fn()}
        onValueChange={jest.fn()}
        policyFilter={new Set(['BASIC', 'ADVANCED'])}
        readOnly={false}
        resetKey={0}
        setPaths={new Set()}
        showRanges={false}
      />,
    );
    expect(screen.getByText(/2.*dirty/i)).toBeInTheDocument();
  });

  // Verifies compact mode hides the module heading for single-element parameters.
  it('uses compact rows for single-element parameters', () => {
    render(
      <LegacyView
        arrayCounts={new Map()}
        committedValues={new Map()}
        compact
        dirtyPaths={new Set()}
        elementValues={new Map()}
        expandedKeys={[]}
        invalidPaths={new Set()}
        items={[makeSingleElementItem('perf_mode')]}
        matchSets={null}
        moduleName="Module Properties"
        onExpandedChange={jest.fn()}
        onValueChange={jest.fn()}
        policyFilter={new Set(['BASIC', 'ADVANCED'])}
        readOnly={false}
        resetKey={0}
        setPaths={new Set()}
        showRanges={false}
      />,
    );

    expect(screen.queryByText('Module Properties')).not.toBeInTheDocument();
    expect(screen.getByText('perf_mode')).toBeInTheDocument();
  });
});
