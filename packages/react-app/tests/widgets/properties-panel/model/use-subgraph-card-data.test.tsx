/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/subgraphs', () => ({
  fetchSubgraphProperties: jest.fn(),
  patchSubgraphProperty: jest.fn(),
  patchSubgraphScenario: jest.fn(),
  patchSubgraphVsid: jest.fn(),
}));

import {act, renderHook, waitFor} from '@testing-library/react';

import {
  fetchSubgraphProperties,
  patchSubgraphScenario,
} from '~entities/subgraphs';
import type {TreeViewItem} from '~features/generic-tree-view';
import type {PropertyDto} from '~shared/lib/property.dto';
import {usePropertiesPanelStore} from '~widgets/properties-panel/model/use-properties-panel-store';
import {useSubgraphCardData} from '~widgets/properties-panel/model/use-subgraph-card-data';

const SCENARIO_PROPERTY_ID = 0x08001010;

const scenario: PropertyDto = {
  elements: [
    {
      isReadOnly: false,
      name: 'Scenario ID',
      policy: 'BASIC',
      type: 'ConfigElement',
      value: '1',
    },
  ],
  naturalId: SCENARIO_PROPERTY_ID,
  propertyName: 'Scenario ID',
  systemId: 'prop-scenario',
};

const dirtyItem: TreeViewItem = {
  elements: scenario.elements,
  id: String(SCENARIO_PROPERTY_ID),
  name: 'Scenario ID',
};

describe('useSubgraphCardData scenario save', () => {
  const onStagedChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usePropertiesPanelStore.setState({entries: {}});
  });

  async function commitScenario(): Promise<void> {
    const {result} = renderHook(() =>
      useSubgraphCardData({onStagedChange, projectId: 'p', subgraphId: 'sg-1'}),
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await act(async () => {
      await result.current.handleCommit([dirtyItem]);
    });
  }

  // The scenario PUT is staged even when the follow-up refresh fails.
  it('reports a staged change when the refresh after the PUT fails', async () => {
    (fetchSubgraphProperties as jest.Mock)
      .mockResolvedValueOnce({data: [scenario], success: true})
      .mockResolvedValue({
        issues: [{code: 'X', message: 'down', severity: 'ERROR'}],
      });
    (patchSubgraphScenario as jest.Mock).mockResolvedValue({
      data: {},
      success: true,
    });
    await commitScenario();
    expect(onStagedChange).toHaveBeenCalledTimes(1);
  });

  // The normal path: PUT and refresh both succeed, reported only once.
  it('reports a staged change when the PUT and refresh succeed', async () => {
    (fetchSubgraphProperties as jest.Mock).mockResolvedValue({
      data: [scenario],
      success: true,
    });
    (patchSubgraphScenario as jest.Mock).mockResolvedValue({
      data: {},
      success: true,
    });
    await commitScenario();
    expect(onStagedChange).toHaveBeenCalledTimes(1);
  });

  // A rejected scenario PUT stages nothing.
  it('reports nothing when the scenario PUT fails', async () => {
    (fetchSubgraphProperties as jest.Mock).mockResolvedValue({
      data: [scenario],
      success: true,
    });
    (patchSubgraphScenario as jest.Mock).mockResolvedValue({
      issues: [{code: 'X', message: 'nope', severity: 'ERROR'}],
    });
    await commitScenario();
    expect(onStagedChange).not.toHaveBeenCalled();
  });
});
