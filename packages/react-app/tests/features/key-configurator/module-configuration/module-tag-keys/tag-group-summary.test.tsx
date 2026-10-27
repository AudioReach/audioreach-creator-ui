/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {TagGroupSummary} from '~features/key-configurator/module-configurator-view/ui/module-tag-keys/tag-group-summary';
import type {ConfiguredTkv} from '~shared/types/key-configurator-config.types';

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/button', () => ({
  IconButton: ({'aria-label': ariaLabel, icon, onClick, title}: any) => (
    <button aria-label={ariaLabel} onClick={onClick} title={title}>
      {icon}
    </button>
  ),
}));

// Mock converter utils
jest.mock('~shared/utils/converter-utils', () => ({
  ConvertNumberToHexString: (num: number) =>
    `0x${num.toString(16).toUpperCase()}`,
}));

describe('TagGroupSummary', () => {
  const configurations: ConfiguredTkv[] = [
    {
      keyValuePairs: [
        {
          key: {id: 1, name: 'DeviceRX', systemId: 'k1'},
          value: {id: 10, name: 'BT_Rx', systemId: 'v10'},
        },
      ],
      pidConfig: [],
      systemId: 'tkv-1',
      tagGroup: 'Tag1',
      tagGroupId: 100,
    },
    {
      keyValuePairs: [
        {
          key: {id: 2, name: 'BtProfile', systemId: 'k2'},
          value: {id: 20, name: 'SCO', systemId: 'v20'},
        },
      ],
      pidConfig: [],
      systemId: 'tkv-2',
      tagGroup: 'Tag1',
      tagGroupId: 100,
    },
  ];

  const baseProps = {
    configurations,
    hasActiveSearch: true,
    isEditable: true,
    onDeleteItem: jest.fn(),
    onDeleteTagGroup: jest.fn(),
    onEditItem: jest.fn(),
    tagGroupName: 'Tag1',
  };

  it('renders a copy icon per row when onCopyEntry is provided and calls it with the row ConfiguredTkv', () => {
    const onCopyEntry = jest.fn();
    render(<TagGroupSummary {...baseProps} onCopyEntry={onCopyEntry} />);

    const copyButtons = screen.getAllByRole('button', {name: /copy/i});
    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[1]);

    expect(onCopyEntry).toHaveBeenCalledWith(configurations[1]);
  });

  it('does not render a copy icon when onCopyEntry is omitted (existing behavior preserved)', () => {
    render(<TagGroupSummary {...baseProps} />);

    expect(
      screen.queryByRole('button', {name: /copy/i}),
    ).not.toBeInTheDocument();
  });

  it('applies the highlight class only to the row matching highlightedEntryIndex', () => {
    render(<TagGroupSummary {...baseProps} highlightedEntryIndex={1} />);

    const rows = screen.getAllByRole('listitem');
    expect(rows[1]).toHaveClass('bg-[var(--color-background-neutral-02)]');
    expect(rows[0]).not.toHaveClass('bg-[var(--color-background-neutral-02)]');
  });

  it('renders bracketed key:value labels in key-value displayMode', () => {
    render(<TagGroupSummary {...baseProps} displayMode="key-value" />);

    expect(screen.getByText('[DeviceRX: BT_Rx]')).toBeInTheDocument();
    expect(screen.getByText('[BtProfile: SCO]')).toBeInTheDocument();
  });

  it('renders value-only labels in value-only displayMode', () => {
    render(<TagGroupSummary {...baseProps} displayMode="value-only" />);

    expect(screen.getByText('BT_Rx')).toBeInTheDocument();
    expect(screen.getByText('SCO')).toBeInTheDocument();
  });

  it('falls back to the existing hand-rolled label when displayMode is omitted', () => {
    render(<TagGroupSummary {...baseProps} />);

    expect(screen.getByText('[DeviceRX: BT_Rx]')).toBeInTheDocument();
    expect(screen.getByText('[BtProfile: SCO]')).toBeInTheDocument();
  });

  it('renders the Copy icon after the label so it sits at the row end', () => {
    render(<TagGroupSummary {...baseProps} onCopyEntry={jest.fn()} />);

    const row = screen.getAllByRole('listitem')[0];
    const label = screen.getByText('[DeviceRX: BT_Rx]');
    const copyButton = screen.getAllByRole('button', {name: /copy/i})[0];
    const children = Array.from(row.children);

    expect(children.indexOf(label)).toBeLessThan(children.indexOf(copyButton));
  });
});
