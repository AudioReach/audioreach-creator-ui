/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';

import {StatusStrip} from '~features/generic-tree-view/ui/components/status-strip';

jest.mock('~shared/lib/logger');

describe('StatusStrip', () => {
  describe('param count label', () => {
    it('shows simple param count when totalParamCount is not provided', () => {
      render(<StatusStrip dirtyCount={0} paramCount={5} setCount={0} />);
      expect(screen.getByText('5 params')).toBeInTheDocument();
    });

    it('shows "N of M params" when paramCount differs from totalParamCount', () => {
      render(
        <StatusStrip
          dirtyCount={0}
          paramCount={3}
          setCount={0}
          totalParamCount={10}
        />,
      );
      expect(screen.getByText('3 of 10 params')).toBeInTheDocument();
    });

    it('shows simple count when paramCount equals totalParamCount', () => {
      render(
        <StatusStrip
          dirtyCount={0}
          paramCount={10}
          setCount={0}
          totalParamCount={10}
        />,
      );
      expect(screen.getByText('10 params')).toBeInTheDocument();
    });
  });

  describe('dirty count', () => {
    it('hides dirty indicator when dirtyCount is 0', () => {
      render(<StatusStrip dirtyCount={0} paramCount={5} setCount={0} />);
      expect(screen.queryByText(/dirty/)).not.toBeInTheDocument();
    });

    it('shows dirty indicator when dirtyCount > 0', () => {
      render(<StatusStrip dirtyCount={3} paramCount={5} setCount={0} />);
      expect(screen.getByText('3 dirty')).toBeInTheDocument();
    });

    it('renders dirty label with the warning icon utility', () => {
      render(<StatusStrip dirtyCount={2} paramCount={5} setCount={0} />);
      const dirty = screen.getByText('2 dirty');
      expect(dirty).toHaveClass('text-icon-support-warning');
    });
  });

  describe('set count', () => {
    it('hides set indicator when setCount is 0', () => {
      render(<StatusStrip dirtyCount={0} paramCount={5} setCount={0} />);
      expect(screen.queryByText(/set/)).not.toBeInTheDocument();
    });

    it('shows set indicator when setCount > 0', () => {
      render(<StatusStrip dirtyCount={0} paramCount={5} setCount={4} />);
      expect(screen.getByText('4 set')).toBeInTheDocument();
    });

    it('renders set label with the success utility', () => {
      render(<StatusStrip dirtyCount={0} paramCount={5} setCount={1} />);
      const set = screen.getByText('1 set');
      expect(set).toHaveClass('text-support-success');
    });
  });

  it('shows both dirty and set counts simultaneously', () => {
    render(<StatusStrip dirtyCount={2} paramCount={8} setCount={3} />);
    expect(screen.getByText('2 dirty')).toBeInTheDocument();
    expect(screen.getByText('3 set')).toBeInTheDocument();
  });
});
