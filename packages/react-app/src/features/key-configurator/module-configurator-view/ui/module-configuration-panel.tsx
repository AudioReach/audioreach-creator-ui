/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Tab, Tabs} from '@qualcomm-ui/react/tabs';

import type {KeyDisplayMode} from '~shared/lib/key-display-mode';

import {CalibrationKeysConfigPanel} from './calibration-keys/calibration-keys-config-panel';
import {ModuleTagKeysConfigPanel} from './module-tag-keys/module-tag-keys-config-panel';

interface ModuleConfigurationPanelProps {
  displayMode: KeyDisplayMode;
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
}

export function ModuleConfigurationPanel({
  displayMode,
  instanceSystemId,
  isEditable,
  moduleId,
}: ModuleConfigurationPanelProps) {
  const tabs = [
    {label: 'Calibration Keys', value: 'calibration' as const},
    {label: 'Module Tag Keys', value: 'module-tag' as const},
  ];

  return (
    <Tabs.Root defaultValue="calibration" size="xl">
      <Tabs.List>
        <Tabs.Indicator />
        {tabs.map((tab) => (
          <Tab.Root key={tab.value} value={tab.value}>
            <Tab.Button>{tab.label}</Tab.Button>
          </Tab.Root>
        ))}
      </Tabs.List>

      <Tabs.Panel value="calibration">
        <CalibrationKeysConfigPanel
          ckvDisplayMode={displayMode}
          instanceSystemId={instanceSystemId}
          isEditable={isEditable}
          moduleId={moduleId}
        />
      </Tabs.Panel>

      <Tabs.Panel value="module-tag">
        <ModuleTagKeysConfigPanel
          instanceSystemId={instanceSystemId}
          isEditable={isEditable}
          moduleId={moduleId}
          tkvDisplayMode={displayMode}
        />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
