/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  CkvDto,
  ModuleInstanceTuningConfigDto,
} from '~entities/key-configurator/model/module-instance-config.dto';
import type {
  KeyDefinitionResponseDto,
  ValueDefinitionDto,
} from '~entities/key-definitions/model/key-definition.dto';
import type {
  ParamDefinitionsSummaryInfo,
  SpfModuleDefinitionResponseDto,
} from '~entities/module-definitions/model/module-definition.dto';

import type {
  CalibrationKey,
  CkvParameter,
  ConfiguredCkv,
} from './calibration-keys-config.types';

/**
 * Transforms backend CkvDto array to UI ConfiguredCKV format
 */
export function transformCkvsToConfiguredKeys(ckvs: CkvDto[]): ConfiguredCkv[] {
  return ckvs.map((ckv) => transformCkvToConfiguredCKV(ckv));
}

/**
 * Transforms a single CkvDto to ConfiguredCKV format
 */
function transformCkvToConfiguredCKV(ckv: CkvDto): ConfiguredCkv {
  const keyValuePairs = ckv.keyValueCollection.map((kv) => ({
    key: {
      id: kv.keyInfo.keyId,
      name: kv.keyInfo.keyLabel,
    },
    value: {
      id: kv.valueInfo.valueId,
      name: kv.valueInfo.valueLabel,
    },
  }));

  // Map supported parameters to PID array
  const pidConfig = ckv.supportedParameters.map(
    (paramInfo) => paramInfo.paramId,
  );

  return {
    keyValuePairs,
    pidConfig,
  };
}

/**
 * Transforms backend ModuleInstanceTuningConfigDto to UI ConfiguredCKV array
 */
export function transformTuningConfigToConfiguredKeys(
  backendData: ModuleInstanceTuningConfigDto,
): ConfiguredCkv[] {
  return transformCkvsToConfiguredKeys(backendData.ckvs);
}

/**
 * Transforms paramDefinitionsSummaryInfo to CKVParameter array
 * @param paramDefinitions - Array of parameter definitions from module definition
 * @returns Array of CKVParameter with checked set to false by default
 */
export function transformParamDefinitionsToCKVParameters(
  paramDefinitions: ParamDefinitionsSummaryInfo[],
): CkvParameter[] {
  return paramDefinitions.map((paramDef) => ({
    checked: false,
    name: paramDef.name,
    pid: paramDef.paramId,
  }));
}

/**
 * Transforms SpfModuleDefinitionResponseDto to CKVParameter array
 * @param moduleDefinition - Module definition DTO
 * @returns Array of CKVParameter with checked set to false by default
 */
export function transformModuleDefinitionToCKVParameters(
  moduleDefinition: SpfModuleDefinitionResponseDto,
): CkvParameter[] {
  return transformParamDefinitionsToCKVParameters(
    moduleDefinition.paramDefinitionsSummaryInfo,
  );
}

/**
 * Transforms a single ValueDefinitionDto to CalibrationKey value format
 * @param valueDto - Value definition from backend
 * @returns Transformed value object with id and name
 */
export function transformValueDefinition(valueDto: ValueDefinitionDto): {
  id: number;
  name: string;
} {
  return {
    id: valueDto.valueId,
    name: valueDto.name,
  };
}

/**
 * Transforms a single KeyDefinitionResponseDto to CalibrationKey format
 * @param keyDto - Key definition from backend
 * @returns Transformed CalibrationKey object
 */
function transformKeyDefinitionToCalibrationKey(
  keyDto: KeyDefinitionResponseDto,
): CalibrationKey {
  return {
    id: keyDto.keyId,
    name: keyDto.name,
    values: keyDto.values.map(transformValueDefinition),
  };
}

/**
 * Transforms an array of KeyDefinitionResponseDto to Record<string, CalibrationKey> format
 * Filters only calibration keys (where isCalibrationKey is true)
 * @param keyDefinitions - Array of key definitions from backend
 * @returns Record with key name as key and CalibrationKey as value
 */
export function transformKeyDefinitionsToCalibrationKeys(
  keyDefinitions: KeyDefinitionResponseDto[],
): Record<string, CalibrationKey> {
  const calibrationKeys = keyDefinitions.filter(
    (keyDef) => keyDef.isCalibrationKey,
  );

  return calibrationKeys.reduce(
    (acc, keyDef) => {
      acc[keyDef.name] = transformKeyDefinitionToCalibrationKey(keyDef);
      return acc;
    },
    {} as Record<string, CalibrationKey>,
  );
}
