/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Tab, Tabs} from '@qualcomm-ui/react/tabs';

import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import type {
  ConfiguredCkv,
  ConfiguredTkv,
  GraphKey,
  TagGroup,
} from '~shared/types/key-configurator-config.types';

import {CalibrationKeysConfigPanel} from './calibration-keys/calibration-keys-config-panel';
import {ModuleTagKeysConfigPanel} from './module-tag-keys/module-tag-keys-config-panel';

interface ModuleConfigurationPanelProps {
  addCkvs: (
    instanceSystemId: string,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  addTkvs: (
    instanceSystemId: string,
    tagGroupId: number,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  calibrationKeys: Record<string, GraphKey>;
  configuredCkvs: ConfiguredCkv[];
  configuredTkvs: ConfiguredTkv[];
  deleteCkvs: (
    instanceSystemId: string,
    ckvSystemIds: string[],
  ) => Promise<boolean>;
  deleteTagGroup: (
    instanceSystemId: string,
    tagGroupId: number,
  ) => Promise<boolean>;
  deleteTkvs: (
    instanceSystemId: string,
    targets: Array<{tagGroupId: number; tkvSystemId: string}>,
  ) => Promise<boolean>;
  instanceSystemId: string;
  isEditable: boolean;
  moduleId: number;
  moduleTagKeys: Record<string, TagGroup>;
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
  updateCkvParametersOnly: (
    instanceSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  updateConfiguredCkvs: (
    instanceSystemId: string,
    ckvs: ConfiguredCkv[],
  ) => void;
  updateTkvParameters: (
    instanceSystemId: string,
    tkvSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
}

export function ModuleConfigurationPanel({
  addCkvs,
  addTkvs,
  calibrationKeys,
  configuredCkvs,
  configuredTkvs,
  deleteCkvs,
  deleteTagGroup,
  deleteTkvs,
  instanceSystemId,
  isEditable,
  moduleId,
  moduleTagKeys,
  paramDefinitionsSummaryInfo,
  updateCkvParametersOnly,
  updateConfiguredCkvs,
  updateTkvParameters,
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
          addCkvs={addCkvs}
          calibrationKeys={calibrationKeys}
          configuredCkvs={configuredCkvs}
          deleteCkvs={deleteCkvs}
          instanceSystemId={instanceSystemId}
          isEditable={isEditable}
          moduleId={moduleId}
          paramDefinitionsSummaryInfo={paramDefinitionsSummaryInfo}
          updateCkvParametersOnly={updateCkvParametersOnly}
          updateConfiguredCkvs={updateConfiguredCkvs}
        />
      </Tabs.Panel>

      <Tabs.Panel value="module-tag">
        <ModuleTagKeysConfigPanel
          addTkvs={addTkvs}
          configuredTkvs={configuredTkvs}
          deleteTagGroup={deleteTagGroup}
          deleteTkvs={deleteTkvs}
          instanceSystemId={instanceSystemId}
          isEditable={isEditable}
          moduleId={moduleId}
          moduleTagKeys={moduleTagKeys}
          paramDefinitionsSummaryInfo={paramDefinitionsSummaryInfo}
          updateTkvParameters={updateTkvParameters}
        />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
