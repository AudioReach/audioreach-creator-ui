/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {Toolbar} from '~features/generic-tree-view/ui/components/toolbar';

jest.mock('~shared/lib/logger');

// ── Default props helper ─────────────────────────────────────────────────────

function makeProps(
  overrides: Partial<Parameters<typeof Toolbar>[0]> = {},
): Parameters<typeof Toolbar>[0] {
  return {
    dirtyPaths: new Set<string>(),
    invalidPaths: new Set<string>(),
    isExpanding: false,
    onCollapseAll: jest.fn(),
    onExpandAll: jest.fn(),
    onPolicyFilterChange: jest.fn(),
    onSearchChange: jest.fn(),
    onShowBadgesChange: jest.fn(),
    onShowErrorsOnlyChange: jest.fn(),
    onShowModifiedOnlyChange: jest.fn(),
    onShowPidsChange: jest.fn(),
    onShowRangesChange: jest.fn(),
    onViewModeChange: jest.fn(),
    policyFilter: new Set<'BASIC' | 'ADVANCED'>(['BASIC']),
    searchText: '',
    showBadges: false,
    showErrorsOnly: false,
    showModifiedOnly: false,
    showPids: false,
    showRanges: false,
    viewMode: 'modern',
    ...overrides,
  };
}

// ── Rendering ────────────────────────────────────────────────────────────────

describe('Toolbar', () => {
  it('renders the search input', () => {
    render(<Toolbar {...makeProps()} />);
    // TextInput mock renders a <div data-testid="q-text-input"> wrapping an
    // <input data-testid="text-input">
    expect(screen.getByTestId('text-input')).toBeInTheDocument();
  });

  it('renders the segmented policy filter control', () => {
    render(<Toolbar {...makeProps()} />);
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('renders both Basic and Advanced filter items', () => {
    render(<Toolbar {...makeProps()} />);
    const items = screen.getAllByTestId('seg-item');
    const values = items.map((el) => el.getAttribute('data-value'));
    expect(values).toContain('BASIC');
    expect(values).toContain('ADVANCED');
  });

  it('renders Collapse All and Expand All buttons', () => {
    render(<Toolbar {...makeProps()} />);
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
    expect(screen.getByText('Expand All')).toBeInTheDocument();
  });

  it('shows Legacy button when viewMode is modern', () => {
    render(<Toolbar {...makeProps({viewMode: 'modern'})} />);
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });

  it('shows Modern button when viewMode is legacy', () => {
    render(<Toolbar {...makeProps({viewMode: 'legacy'})} />);
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });

  it('renders PIDs, Ranges, Badges toggles when viewMode is modern', () => {
    render(<Toolbar {...makeProps({viewMode: 'modern'})} />);
    expect(screen.getByText('PIDs')).toBeInTheDocument();
    expect(screen.getByText('Ranges')).toBeInTheDocument();
    expect(screen.getByText('Badges')).toBeInTheDocument();
  });

  it('does not render PIDs toggle when viewMode is legacy', () => {
    render(<Toolbar {...makeProps({viewMode: 'legacy'})} />);
    expect(screen.queryByText('PIDs')).not.toBeInTheDocument();
  });

  // ── Handler callbacks ────────────────────────────────────────────────────

  it('calls onSearchChange when text input value changes', () => {
    const onSearchChange = jest.fn();
    render(<Toolbar {...makeProps({onSearchChange})} />);
    fireEvent.change(screen.getByTestId('text-input'), {
      target: {value: 'test query'},
    });
    expect(onSearchChange).toHaveBeenCalledWith(
      'test query',
      expect.anything(),
    );
  });

  it('calls onCollapseAll when Collapse All is clicked', () => {
    const onCollapseAll = jest.fn();
    render(<Toolbar {...makeProps({onCollapseAll})} />);
    fireEvent.click(screen.getByText('Collapse All'));
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('calls onExpandAll when Expand All is clicked', () => {
    const onExpandAll = jest.fn();
    render(<Toolbar {...makeProps({onExpandAll})} />);
    fireEvent.click(screen.getByText('Expand All'));
    expect(onExpandAll).toHaveBeenCalledTimes(1);
  });

  it('Expand All button is disabled while isExpanding is true', () => {
    render(<Toolbar {...makeProps({isExpanding: true})} />);
    const btn = screen.getByText('Expand All').closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls onViewModeChange with legacy when switching from modern', () => {
    const onViewModeChange = jest.fn();
    render(<Toolbar {...makeProps({onViewModeChange, viewMode: 'modern'})} />);
    fireEvent.click(screen.getByText('Legacy'));
    expect(onViewModeChange).toHaveBeenCalledWith('legacy');
  });

  it('calls onViewModeChange with modern when switching from legacy', () => {
    const onViewModeChange = jest.fn();
    render(<Toolbar {...makeProps({onViewModeChange, viewMode: 'legacy'})} />);
    fireEvent.click(screen.getByText('Modern'));
    expect(onViewModeChange).toHaveBeenCalledWith('modern');
  });

  it('calls onShowPidsChange when PIDs switch is toggled', () => {
    const onShowPidsChange = jest.fn();
    render(
      <Toolbar
        {...makeProps({onShowPidsChange, showPids: false, viewMode: 'modern'})}
      />,
    );
    const checkboxes = screen.getAllByTestId('q-switch');
    // The three switches are PIDs, Ranges, Badges — PIDs is first
    const pidsCheckbox = checkboxes[0].querySelector('input[type="checkbox"]');
    expect(pidsCheckbox).not.toBeNull();
    fireEvent.click(pidsCheckbox!);
    expect(onShowPidsChange).toHaveBeenCalledWith(true);
  });

  // ── Modified Only / Errors Only filters ──────────────────────────────────

  it('does not render Modified Only switch when dirtyPaths is empty', () => {
    render(<Toolbar {...makeProps({dirtyPaths: new Set()})} />);
    expect(screen.queryByText('Modified Only')).not.toBeInTheDocument();
  });

  it('renders Modified Only switch when dirtyPaths is non-empty', () => {
    render(<Toolbar {...makeProps({dirtyPaths: new Set(['100/gain'])})} />);
    expect(screen.getByText('Modified Only')).toBeInTheDocument();
  });

  it('does not render Errors Only switch when invalidPaths is empty', () => {
    render(<Toolbar {...makeProps({invalidPaths: new Set()})} />);
    expect(screen.queryByText('Errors Only')).not.toBeInTheDocument();
  });

  it('renders Errors Only switch when invalidPaths is non-empty', () => {
    render(<Toolbar {...makeProps({invalidPaths: new Set(['100/gain'])})} />);
    expect(screen.getByText('Errors Only')).toBeInTheDocument();
  });

  it('does not render Modified Only or Errors Only switches in legacy view', () => {
    render(
      <Toolbar
        {...makeProps({
          dirtyPaths: new Set(['100/gain']),
          invalidPaths: new Set(['100/gain']),
          viewMode: 'legacy',
        })}
      />,
    );
    expect(screen.queryByText('Modified Only')).not.toBeInTheDocument();
    expect(screen.queryByText('Errors Only')).not.toBeInTheDocument();
  });

  it('calls onShowModifiedOnlyChange when Modified Only switch is toggled', () => {
    const onShowModifiedOnlyChange = jest.fn();
    render(
      <Toolbar
        {...makeProps({
          dirtyPaths: new Set(['100/gain']),
          onShowModifiedOnlyChange,
          showModifiedOnly: false,
        })}
      />,
    );
    const checkbox = screen
      .getByText('Modified Only')
      .closest('[data-testid="q-switch"]')
      ?.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    fireEvent.click(checkbox!);
    expect(onShowModifiedOnlyChange).toHaveBeenCalledWith(true);
  });

  it('calls onShowErrorsOnlyChange when Errors Only switch is toggled', () => {
    const onShowErrorsOnlyChange = jest.fn();
    render(
      <Toolbar
        {...makeProps({
          invalidPaths: new Set(['100/gain']),
          onShowErrorsOnlyChange,
          showErrorsOnly: false,
        })}
      />,
    );
    const checkbox = screen
      .getByText('Errors Only')
      .closest('[data-testid="q-switch"]')
      ?.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    fireEvent.click(checkbox!);
    expect(onShowErrorsOnlyChange).toHaveBeenCalledWith(true);
  });
});
