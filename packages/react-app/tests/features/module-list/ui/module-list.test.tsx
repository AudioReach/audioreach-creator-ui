/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('@qualcomm-ui/react/popover', () => ({
  Popover: ({
    children,
    trigger,
  }: {
    children: React.ReactNode;
    trigger: React.ReactNode;
  }) => (
    <>
      {trigger}
      {children}
    </>
  ),
}));

const mockUseModuleList = jest.fn();
let mockEditModeState: 'edit' | 'view' = 'edit';

jest.mock('~features/graph-designer', () => ({
  useModuleList: () => mockUseModuleList(),
}));

jest.mock('~shared/config/utils', () => ({
  isValidProjectId: () => true,
}));

jest.mock('~shared/store', () => ({
  useProjectStoreShallow: (
    selector: (state: {editModeState: string}) => unknown,
  ) => selector({editModeState: mockEditModeState}),
}));

jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: (selector: (state: {activeProjectId: string}) => unknown) =>
    selector({activeProjectId: 'project-1'}),
}));

import {render, screen} from '@testing-library/react';

import type {ModuleDefinition} from '~features/graph-designer/model/module-list-slice';
import {ModuleList} from '~features/module-list/ui/module-list';

const modules: ModuleDefinition[] = [
  {
    builtIn: true,
    category: '',
    description: '',
    dspType: 'ADSP',
    inputPorts: [],
    moduleDefinitionSystemId: 'uncategorized-adsp',
    moduleId: '1',
    moduleName: 'Uncategorized ADSP',
    moduleType: '',
    outputPorts: [],
    processorSystemId: 'adsp',
  },
  {
    builtIn: true,
    category: 'PP',
    description: '',
    dspType: 'ADSP',
    inputPorts: [],
    moduleDefinitionSystemId: 'pp-adsp',
    moduleId: '2',
    moduleName: 'PP ADSP',
    moduleType: '',
    outputPorts: [],
    processorSystemId: 'adsp',
  },
  {
    builtIn: true,
    category: 'SISO',
    description: '',
    dspType: 'ADSP',
    inputPorts: [],
    moduleDefinitionSystemId: 'siso-adsp',
    moduleId: '3',
    moduleName: 'SISO ADSP',
    moduleType: '',
    outputPorts: [],
    processorSystemId: 'adsp',
  },
  {
    builtIn: true,
    category: '',
    description: '',
    dspType: 'CDSP',
    inputPorts: [],
    moduleDefinitionSystemId: 'uncategorized-cdsp',
    moduleId: '4',
    moduleName: 'Uncategorized CDSP',
    moduleType: '',
    outputPorts: [],
    processorSystemId: 'cdsp',
  },
];

describe('ModuleList', () => {
  beforeEach(() => {
    mockEditModeState = 'edit';
    mockUseModuleList.mockReturnValue({
      loadModuleList: jest.fn(),
      moduleList: modules,
      moduleListSearchQuery: '',
      moduleListStatus: 'ready',
      selectedDspTypes: ['ADSP'],
      selectedModuleTypes: ['PP'],
      setModuleListSearchQuery: jest.fn(),
      setSelectedDspTypes: jest.fn(),
      setSelectedModuleTypes: jest.fn(),
    });
  });

  it('marks module rows as draggable in edit mode', () => {
    render(<ModuleList />);

    const row = screen.getByText('PP ADSP').closest('li');
    expect(row).toHaveAttribute('aria-disabled', 'false');
    expect(row).toHaveAttribute('draggable', 'true');
  });

  it('disables module rows in read-only mode', () => {
    mockEditModeState = 'view';

    render(<ModuleList />);

    const row = screen.getByText('PP ADSP').closest('li');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('draggable', 'false');
    expect(
      screen.getAllByText('Switch to edit mode to drag modules'),
    ).toHaveLength(2);
  });

  it('shows modules without a category regardless of selected module types', () => {
    render(<ModuleList />);

    expect(screen.getByText('Uncategorized ADSP')).toBeInTheDocument();
    expect(screen.getByText('PP ADSP')).toBeInTheDocument();
    expect(screen.queryByText('SISO ADSP')).not.toBeInTheDocument();
    expect(screen.queryByText('Uncategorized CDSP')).not.toBeInTheDocument();
  });

  it('bounds long module descriptions inside the tooltip content', () => {
    const longDescription = 'PCM source details '.repeat(40);
    mockUseModuleList.mockReturnValue({
      loadModuleList: jest.fn(),
      moduleList: [{...modules[0], description: longDescription}],
      moduleListSearchQuery: '',
      moduleListStatus: 'ready',
      selectedDspTypes: ['ADSP'],
      selectedModuleTypes: [],
      setModuleListSearchQuery: jest.fn(),
      setSelectedDspTypes: jest.fn(),
      setSelectedModuleTypes: jest.fn(),
    });

    render(<ModuleList />);

    const tooltipContent = screen.getByTestId('q-tooltip').lastElementChild;

    expect(tooltipContent).toBeInTheDocument();
    expect(tooltipContent).toHaveTextContent(longDescription.trim());
    expect(tooltipContent).toHaveStyle({
      maxWidth: 'min(24rem, calc(100vw - 2rem))',
      overflowWrap: 'anywhere',
    });
  });
});
