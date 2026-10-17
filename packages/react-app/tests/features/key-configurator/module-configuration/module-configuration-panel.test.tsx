/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Minimal Tabs mock tracking active value via context, mirroring the
// pattern in tests/widgets/module-data-tab/ui/module-data-tab.test.tsx.
// Rendering the real @qualcomm-ui/react/tabs component here triggers an
// async indicator-rect sync state update outside act(), which this repo's
// test-setup treats as a hard failure (any unfiltered console.error fails
// the test) — so the real component isn't usable directly in this suite.
jest.mock('@qualcomm-ui/react/tabs', () => {
  const React = jest.requireActual('react');
  const TabsContext = React.createContext<{
    onValueChange: (value: string) => void;
    value: string | null;
  }>({onValueChange: () => {}, value: null});

  return {
    Tab: {
      Button: ({children}: {children: unknown}) =>
        React.createElement('button', {type: 'button'}, children),
      Root: ({children, value}: {children: unknown; value: string}) => {
        const {onValueChange} = React.useContext(TabsContext);
        return React.createElement(
          'div',
          {onClick: () => onValueChange(value), role: 'tab'},
          children,
        );
      },
    },
    Tabs: {
      Indicator: () => null,
      List: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Panel: ({children, value}: {children: unknown; value: string}) => {
        const {value: activeValue} = React.useContext(TabsContext);
        return React.createElement(
          'div',
          {'data-testid': `panel-${value}`, hidden: activeValue !== value},
          children,
        );
      },
      Root: ({
        children,
        defaultValue,
      }: {
        children: unknown;
        defaultValue: string;
      }) => {
        const [value, setValue] = React.useState(defaultValue);
        return React.createElement(
          TabsContext.Provider,
          {value: {onValueChange: setValue, value}},
          children,
        );
      },
    },
  };
});

import {render, screen} from '@testing-library/react';

import {ModuleConfigurationPanel} from '~features/key-configurator/module-configurator-view/ui/module-configuration-panel';

// Mock CalibrationKeysConfigPanel
jest.mock(
  '~features/key-configurator/module-configurator-view/ui/calibration-keys/calibration-keys-config-panel',
  () => ({
    CalibrationKeysConfigPanel: () => (
      <div data-testid="calibration-keys-panel" />
    ),
  }),
);

let capturedModuleTagKeysProps: Record<string, unknown> | null = null;

// Mock ModuleTagKeysConfigPanel, capturing the props it receives so the
// forwarding tests below can assert on them.
jest.mock(
  '~features/key-configurator/module-configurator-view/ui/module-tag-keys/module-tag-keys-config-panel',
  () => ({
    ModuleTagKeysConfigPanel: (props: Record<string, unknown>) => {
      capturedModuleTagKeysProps = props;
      return <div data-testid="module-tag-keys-panel" />;
    },
  }),
);

describe('ModuleConfigurationPanel', () => {
  const baseProps = {
    displayMode: 'key-value' as const,
    instanceSystemId: 'mod-1',
    isEditable: true,
    moduleId: 1,
  };

  beforeEach(() => {
    capturedModuleTagKeysProps = null;
  });

  it('keeps both tab panels mounted regardless of the active tab', () => {
    render(<ModuleConfigurationPanel {...baseProps} />);

    expect(screen.getByTestId('calibration-keys-panel')).toBeInTheDocument();
    expect(screen.getByTestId('module-tag-keys-panel')).toBeInTheDocument();
  });

  it('hides the inactive tab panel visually instead of unmounting it', () => {
    render(<ModuleConfigurationPanel {...baseProps} />);

    // Default tab is "calibration", so the module-tag panel's wrapper
    // should be present but hidden rather than absent from the DOM.
    const moduleTagPanel = screen.getByTestId('module-tag-keys-panel');
    const panelWrapper = moduleTagPanel.closest('[hidden]');
    expect(panelWrapper).not.toBeNull();

    const calibrationPanel = screen.getByTestId('calibration-keys-panel');
    const activePanelWrapper = calibrationPanel.closest('[data-testid]');
    expect(activePanelWrapper).not.toHaveAttribute('hidden');
  });

  it('forwards instanceSystemId, isEditable, moduleId, and displayMode to ModuleTagKeysConfigPanel', () => {
    render(<ModuleConfigurationPanel {...baseProps} />);

    expect(capturedModuleTagKeysProps).toMatchObject({
      instanceSystemId: 'mod-1',
      isEditable: true,
      moduleId: 1,
      tkvDisplayMode: 'key-value',
    });
  });
});
