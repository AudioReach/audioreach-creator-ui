/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ParamDefinitionsSummaryInfo,
  SpfModuleDefinitionResponseDto,
} from '~entities/module-definitions/model/module-definition.dto';
import * as ckvMapper from '~features/key-configurator/module-configurator-view/ui/calibration-keys/ckv.mapper';

describe('transformParamDefinitionsToCKVParameters', () => {
  const paramDefinitions: ParamDefinitionsSummaryInfo[] = [
    {
      deprecated: false,
      description: 'HW MF config',
      isHidden: false,
      isReadOnly: false,
      name: 'PARAM_ID_HW_MF_CFG',
      naturalId: 134221847,
      pidType: 'STATIC',
      systemId: 'sys1',
      toolPolicy: 'READ_WRITE',
    },
    {
      deprecated: false,
      description: 'EP frame size',
      isHidden: false,
      isReadOnly: false,
      name: 'PARAM_ID_HW_EP_FRAME_SIZE',
      naturalId: 134221848,
      pidType: 'STATIC',
      systemId: 'sys1',
      toolPolicy: 'READ_WRITE',
    },
  ];

  it('maps parameter definitions to CKV parameters with checked set to false', () => {
    const result =
      ckvMapper.transformParamDefinitionsToCKVParameters(paramDefinitions);

    expect(result).toEqual([
      {checked: false, name: 'PARAM_ID_HW_MF_CFG', pid: 134221847},
      {checked: false, name: 'PARAM_ID_HW_EP_FRAME_SIZE', pid: 134221848},
    ]);
  });

  it('returns an empty array when given no parameter definitions', () => {
    expect(ckvMapper.transformParamDefinitionsToCKVParameters([])).toEqual([]);
  });
});

describe('transformModuleDefinitionToCKVParameters', () => {
  const paramDefinitions: ParamDefinitionsSummaryInfo[] = [
    {
      deprecated: false,
      description: 'I2S interface config',
      isHidden: false,
      isReadOnly: false,
      name: 'PARAM_ID_I2S_INTF_CFG',
      naturalId: 134221849,
      pidType: 'STATIC',
      systemId: 'sys1',
      toolPolicy: 'READ_WRITE',
    },
  ];

  const moduleDefinition: SpfModuleDefinitionResponseDto = {
    builtIn: true,
    description: 'Test module',
    displayName: 'Test Module',
    isCustomModule: false,
    isLoadedAtBootup: false,
    modSearchKeys: '',
    moduleInfo: {
      containerTypeInfo: [],
      dynamicIntents: [],
      inputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      outputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      pidFramework: 0,
      staticCtrlPorts: [],
    },
    name: 'TEST_MODULE',
    naturalId: 1,
    paramDefinitionsSummaryInfo: paramDefinitions,
    processorInfo: {name: 'ADSP', naturalId: 1, systemId: 'sys1'},
    systemId: 'sys1',
  };

  it('delegates to transformParamDefinitionsToCKVParameters using paramDefinitionsSummaryInfo', () => {
    const result =
      ckvMapper.transformModuleDefinitionToCKVParameters(moduleDefinition);

    expect(result).toEqual([
      {checked: false, name: 'PARAM_ID_I2S_INTF_CFG', pid: 134221849},
    ]);
  });
});

describe('ckv.mapper exports', () => {
  it('no longer exports the functions moved to the entity layer', () => {
    expect(
      (ckvMapper as Record<string, unknown>)
        .transformKeyDefinitionsToCalibrationKeys,
    ).toBeUndefined();
    expect(
      (ckvMapper as Record<string, unknown>)
        .transformTuningConfigToConfiguredKeys,
    ).toBeUndefined();
  });
});
