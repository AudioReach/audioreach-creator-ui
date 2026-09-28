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

jest.mock('~features/graph-designer', () => ({
  useModuleList: () => mockUseModuleList(),
}));

jest.mock('~shared/config/utils', () => ({
  isValidProjectId: () => true,
}));

jest.mock('~shared/store', () => ({
  useProjectStoreShallow: (
    selector: (state: {editModeState: string}) => unknown,
  ) => selector({editModeState: 'edit'}),
}));

jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: (
    selector: (state: {activeProjectId: string}) => unknown,
  ) => selector({activeProjectId: 'project-1'}),
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

  it('shows modules without a category regardless of selected module types', () => {
    render(<ModuleList />);

    expect(screen.getByText('Uncategorized ADSP')).toBeInTheDocument();
    expect(screen.getByText('PP ADSP')).toBeInTheDocument();
    expect(screen.queryByText('SISO ADSP')).not.toBeInTheDocument();
    expect(screen.queryByText('Uncategorized CDSP')).not.toBeInTheDocument();
  });
});
