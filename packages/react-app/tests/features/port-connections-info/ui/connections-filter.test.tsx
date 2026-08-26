/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Children, isValidElement, type ReactNode} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

jest.mock('@qualcomm-ui/react/segmented-control', () => ({
  SegmentedControl: {
    Item: ({text, value}: {text: string; value: string}) => (
      <button data-testid="seg-item" data-value={value}>
        {text}
      </button>
    ),
    Root: ({
      children,
      onValueChange,
    }: {
      children: ReactNode;
      onValueChange: (value: string[]) => void;
    }) => (
      <div>
        {Children.map(children, (child) => {
          if (!isValidElement<{value: string}>(child)) {
            return child;
          }
          return (
            <div
              onClick={() => onValueChange([child.props.value])}
              role="button"
            >
              {child}
            </div>
          );
        })}
      </div>
    ),
  },
}));

import {ConnectionsFilter} from '~features/port-connections-info/ui/connections-filter';

describe('ConnectionsFilter', () => {
  it('renders all three segments', () => {
    render(<ConnectionsFilter onChange={jest.fn()} value="all" />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Subgraph')).toBeInTheDocument();
    expect(screen.getByText('Dangling')).toBeInTheDocument();
  });

  it.each([
    ['All', 'all'],
    ['Subgraph', 'sg'],
    ['Dangling', 'dangling'],
  ] as const)('calls onChange with %s -> %s', (label, expectedValue) => {
    const onChange = jest.fn();
    render(<ConnectionsFilter onChange={onChange} value="all" />);
    fireEvent.click(screen.getByText(label));
    expect(onChange).toHaveBeenCalledWith(expectedValue);
  });
});
