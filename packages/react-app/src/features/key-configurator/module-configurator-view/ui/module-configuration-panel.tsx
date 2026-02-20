/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {Tab, Tabs} from '@qualcomm-ui/react/tabs';

import {CalibrationKeysConfigPanel} from './calibration-keys/calibration-keys-config-panel';
import {ModuleTagKeysConfigPanel} from './module-tag-keys/module-tag-keys-config-panel';

interface ModuleConfigurationPanelProps {
  instanceId: number;
  isEditable: boolean;
  moduleId: number;
}

export function ModuleConfigurationPanel({
  instanceId,
  isEditable,
  moduleId,
}: ModuleConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState<'calibration' | 'module-tag'>(
    'calibration',
  );

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
            <Tab.Button onClick={() => setActiveTab(tab.value)}>
              {tab.label}
            </Tab.Button>
          </Tab.Root>
        ))}
      </Tabs.List>

      <div role="tabpanel">
        {activeTab === 'calibration' && (
          <Tabs.Panel value="calibration">
            <CalibrationKeysConfigPanel
              instanceId={instanceId}
              isEditable={isEditable}
              moduleId={moduleId}
            />
          </Tabs.Panel>
        )}

        {activeTab === 'module-tag' && (
          <Tabs.Panel value="module-tag">
            <ModuleTagKeysConfigPanel
              instanceId={instanceId}
              isEditable={isEditable}
              moduleId={moduleId}
            />
          </Tabs.Panel>
        )}
      </div>
    </Tabs.Root>
  );
}
