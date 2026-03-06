/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDefinitionResponseDto} from '~entities/key-definitions/model/key-definition.dto';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

import {transformValueDefinition} from '../../module-configurator-view/ui/calibration-keys/ckv.mapper';

/**
 * Transforms an array of KeyDefinitionResponseDto to Record<string, GraphKey> format
 * Filters only graph keys (where isGraphKey is true)
 * @param keyDefinitions - Array of key definitions from backend
 * @returns Record with key name as key and GraphKey as value
 */
export function transformKeyDefinitionsToGraphKeys(
  keyDefinitions: KeyDefinitionResponseDto[],
): Record<string, GraphKey> {
  const graphKeys = keyDefinitions.filter((keyDef) => keyDef.isGraphKey);

  const result: Record<string, GraphKey> = {};
  for (const keyDef of graphKeys) {
    result[keyDef.name] = transformKeyDefinitionToGraphKey(keyDef);
  }
  return result;
}

/**
 * Transforms a single KeyDefinitionResponseDto to GraphKey format
 * @param keyDto - Key definition from backend
 * @returns Transformed GraphKey object
 */
function transformKeyDefinitionToGraphKey(
  keyDto: KeyDefinitionResponseDto,
): GraphKey {
  return {
    id: keyDto.keyId,
    name: keyDto.name,
    values: keyDto.values.map((value) => transformValueDefinition(value)),
  };
}
