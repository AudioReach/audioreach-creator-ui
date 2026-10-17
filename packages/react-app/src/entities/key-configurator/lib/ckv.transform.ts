/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';
import type {
  KeyDefinitionResponseDto,
  ValueDefinitionDto,
} from '~entities/key-definitions/model/key-definition.dto';
import type {
  ConfiguredCkv,
  GraphKey,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

function transformValueDefinition(valueDto: ValueDefinitionDto): KeyValue {
  return {
    id: valueDto.naturalId,
    name: valueDto.name,
    systemId: valueDto.systemId,
  };
}

function transformKeyDefinitionToGraphKey(
  keyDto: KeyDefinitionResponseDto,
): GraphKey {
  return {
    id: keyDto.naturalId,
    name: keyDto.name,
    systemId: keyDto.systemId,
    values: keyDto.values.map(transformValueDefinition),
  };
}

export function transformKeyDefinitionsToCalibrationKeys(
  keyDefinitions: KeyDefinitionResponseDto[],
): Record<string, GraphKey> {
  return keyDefinitions.reduce<Record<string, GraphKey>>((acc, keyDef) => {
    acc[keyDef.name] = transformKeyDefinitionToGraphKey(keyDef);
    return acc;
  }, {});
}

export function buildKeyDefinitionLookup(
  availableCalibrationKeys: Record<string, GraphKey>,
): Record<number, GraphKey> {
  return Object.values(availableCalibrationKeys).reduce<
    Record<number, GraphKey>
  >((acc, key) => {
    acc[key.id] = key;
    return acc;
  }, {});
}

export function transformCkvsToConfiguredCkvs(
  ckvs: CkvDto[],
  keyDefinitionsByNaturalId: Record<number, GraphKey>,
): ConfiguredCkv[] {
  return ckvs.map((ckv) => ({
    keyValuePairs: ckv.keyValuePairs.map((kv) => ({
      key: keyDefinitionsByNaturalId[kv.key.naturalId] ?? {
        id: kv.key.naturalId,
        name: kv.key.name,
        systemId: kv.key.systemId,
        values: [],
      },
      value: {
        id: kv.value.naturalId,
        name: kv.value.name,
        systemId: kv.value.systemId,
      },
    })),
    pidConfig: ckv.supportedParameters.map((param) => param.naturalId),
    systemId: ckv.systemId,
  }));
}

export function transformConfiguredCkvsToCkvs(
  ckvs: ConfiguredCkv[],
  keyDefinitionsByNaturalId: Record<number, GraphKey>,
): CkvDto[] {
  return ckvs.map((ckv) => ({
    keyValuePairs: ckv.keyValuePairs.map((pair) => ({
      key: {
        name: keyDefinitionsByNaturalId[pair.key.id]?.name ?? pair.key.name,
        naturalId: pair.key.id,
        systemId: pair.key.systemId,
      },
      value: {
        name: pair.value.name,
        naturalId: pair.value.id,
        systemId: pair.value.systemId,
      },
    })),
    supportedParameters: ckv.pidConfig.map((pid) => ({
      description: '',
      name: '',
      naturalId: pid,
      systemId: '',
    })),
    systemId: ckv.systemId,
  }));
}
