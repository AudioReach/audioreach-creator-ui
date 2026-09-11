/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~entities/subsystems', () => ({
  patchSubsystem: jest.fn(),
}));

import {render, screen} from '@testing-library/react';

import {SubsystemPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/subsystem-properties-card';

import {makeGraphData} from './test-graph-data';

describe('SubsystemPropertiesCard', () => {
  it('renders editable name and copyable subsystem id', () => {
    render(
      <SubsystemPropertiesCard
        graphData={makeGraphData()}
        isEditing
        onSubsystemNameChange={jest.fn()}
        projectId="proj-1"
        subsystemId="ss-1"
      />,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Playback')).not.toHaveAttribute(
      'readOnly',
    );
    expect(
      screen.getByRole('button', {name: 'Copy Subsystem ID'}),
    ).toBeEnabled();
  });
});
