/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@qualcomm-ui/react/dialog', () => {
  const React = jest.requireActual('react');
  return {
    Dialog: {
      Body: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Description: ({children}: {children: unknown}) =>
        React.createElement('p', {}, children),
      FloatingPortal: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Footer: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Heading: ({children}: {children: unknown}) =>
        React.createElement('h2', {}, children),
      IndicatorIcon: () => React.createElement('span', {}),
      Root: ({children, open}: {children: unknown; open: boolean}) =>
        open ? React.createElement('div', {}, children) : null,
    },
  };
});

import {DiscardConfirmDialog} from '~features/graph-designer/ui/discard-confirm-dialog';

describe('DiscardConfirmDialog', () => {
  it('renders the heading and description when open', () => {
    render(
      <DiscardConfirmDialog
        onConfirm={jest.fn()}
        onOpenChange={jest.fn()}
        open
      />,
    );

    expect(screen.getByText('Discard all changes?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This clears every unsaved change in the current session. This cannot be undone.',
      ),
    ).toBeInTheDocument();
  });

  it('calls onConfirm once when Discard changes is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <DiscardConfirmDialog
        onConfirm={onConfirm}
        onOpenChange={jest.fn()}
        open
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Discard changes'}));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) and not onConfirm when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <DiscardConfirmDialog
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
