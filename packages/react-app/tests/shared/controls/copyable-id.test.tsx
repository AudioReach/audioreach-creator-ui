/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {CopyableId} from '~shared/controls/copyable-id';

describe('CopyableId', () => {
  it('copies only the id value', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {clipboard: {writeText}});

    render(<CopyableId label="Module ID" value="mod-1" />);
    await userEvent.click(screen.getByRole('button', {name: 'Copy Module ID'}));

    expect(writeText).toHaveBeenCalledWith('mod-1');
  });
});
