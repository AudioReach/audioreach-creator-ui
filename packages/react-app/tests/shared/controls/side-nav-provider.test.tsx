/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';

import {
  SideNavProvider,
  useSideNavContext,
} from '~shared/controls/side-nav-provider';
import type {SideNavItem} from '~shared/types/side-nav-types';

let capturedItems: SideNavItem[] = [];

function ItemsCapture() {
  capturedItems = useSideNavContext().items;
  return null;
}

function renderWithSideNav(children: ReactNode) {
  return render(<SideNavProvider>{children}</SideNavProvider>);
}

describe('SideNavProvider appearance settings', () => {
  beforeEach(() => {
    capturedItems = [];
  });

  it('exposes Settings as the sole default appearance control', async () => {
    renderWithSideNav(<ItemsCapture />);

    await waitFor(() => expect(capturedItems).not.toHaveLength(0));

    expect(capturedItems.map(({id}) => id)).toContain('__default_settings');
    expect(capturedItems.map(({id}) => id)).not.toContain(
      '__default_theme_toggle',
    );
    expect(
      capturedItems.find(({id}) => id === '__default_settings')?.popoverContent,
    ).toBeTruthy();
  });
});
