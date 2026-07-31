/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockWorkflowUsecaseData = {isLoading: false, resolvedData: []};

jest.mock('~features/graph-designer/ui/apply-discard-controls', () => ({
  ApplyDiscardControls: ({projectId}: {projectId: string}) => (
    <div data-testid="apply-discard-controls">{projectId}</div>
  ),
}));

jest.mock('~features/usecase-selection', () => ({
  UsecaseSelectionControl: () => (
    <div data-testid="usecase-selection-control" />
  ),
  useWorkflowUsecaseData: () => mockWorkflowUsecaseData,
}));

jest.mock('~features/usecase-visualizer', () => ({
  UsecaseVisualizer: () => <div data-testid="usecase-visualizer" />,
}));

jest.mock('~features/search-component', () => ({
  SearchComponent: () => <div data-testid="search-component" />,
}));

jest.mock('~widgets/module-data-tab', () => ({
  ModuleDataTab: () => <div data-testid="module-data-tab" />,
}));

jest.mock('~widgets/project-layout/project-layout-manager', () => ({
  tabLayoutService: {
    createProjectTab: jest.fn(),
  },
}));

jest.mock('~widgets/graph-designer/ui/display-options-popover', () => ({
  DisplayOptionsPopover: () => <div data-testid="display-options-popover" />,
}));

import {render, screen} from '@testing-library/react';

import {GraphDesignerStoreContext} from '~features/graph-designer';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import {SideNavProvider} from '~shared/controls/side-nav-provider';
import {createProjectStore, ProjectStoreContext} from '~shared/store';
import GraphDesigner from '~widgets/graph-designer/ui/graph-designer';

const PROJECT_ID = 'proj-1';

function renderGraphDesigner() {
  const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
  const projectStore = createProjectStore(PROJECT_ID);

  return render(
    <SideNavProvider>
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <GraphDesigner
            projectId={PROJECT_ID}
            screenshotRegistry={new Map()}
            tabId="tab-1"
            usecaseData={[]}
          />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>
    </SideNavProvider>,
  );
}

describe('GraphDesigner — top bar', () => {
  it('mounts ApplyDiscardControls with the projectId prop', () => {
    renderGraphDesigner();

    const applyDiscardControls = screen.getByTestId('apply-discard-controls');
    expect(applyDiscardControls).toBeInTheDocument();
    expect(applyDiscardControls).toHaveTextContent(PROJECT_ID);
  });
});
