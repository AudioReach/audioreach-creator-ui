/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ModuleInstanceTuningConfigDto,
  TagInfoDto,
  TkvDto,
} from '~entities/key-configurator/model/module-instance-config.dto';
import type {
  TagDefinitionResponseDto,
  TagKeyDefinitionInfo,
  TagValueDefinitionInfo,
} from '~entities/key-definitions/model/key-definition.dto';
import type {
  ParameterDefinitionsSummaryInfo,
  SpfModuleDefinitionResponseDto,
} from '~entities/module-definitions/model/module-definition.dto';
import type {GraphKey as ModuleTagKey} from '~shared/types/key-configurator-config.types';

import type {
  ConfiguredTkv,
  TagGroup,
  TkvParameter,
} from './module-tag-keys-config.types';

/**
 * Transforms backend TagInfoDto array to UI ConfiguredTKV format
 */
export function transformTagsToConfiguredTKVs(
  tags: TagInfoDto[],
): ConfiguredTkv[] {
  const configuredTKVs: ConfiguredTkv[] = [];

  // Iterate through each tag group
  for (const tag of tags) {
    // Transform each TKV in the tag to a ConfiguredTKV
    for (const tkv of tag.tkvs) {
      const configuredTKV = transformTkvToConfiguredTKV(
        tkv,
        tag.tagName,
        tag.tagId,
      );
      configuredTKVs.push(configuredTKV);
    }
  }

  return configuredTKVs;
}

/**
 * Transforms a single TkvDto to ConfiguredTKV format
 */
function transformTkvToConfiguredTKV(
  tkv: TkvDto,
  tagGroupName: string,
  tagGroupId: number,
): ConfiguredTkv {
  const keyValuePairs = tkv.keyValueCollection.map((kv) => ({
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
  const pidConfig = tkv.supportedParameters.map(
    (parameterInfo) => parameterInfo.paramId,
  );

  return {
    keyValuePairs,
    pidConfig,
    tagGroup: tagGroupName,
    tagGroupId,
  };
}

/**
 * Transforms backend ModuleInstanceTuningConfigDto to UI ConfiguredTKV array
 */
export function transformTuningConfigToConfiguredTKVs(
  backendData: ModuleInstanceTuningConfigDto,
): ConfiguredTkv[] {
  return transformTagsToConfiguredTKVs(backendData.tags);
}

/**
 * Transforms paramDefinitionsSummaryInfo to TKVParameter array
 * @param paramDefinitions - Array of parameter definitions from module definition
 * @returns Array of TKVParameter with checked set to false by default
 */
export function transformParamDefinitionsToTKVParameters(
  parameterDefinitions: ParameterDefinitionsSummaryInfo[],
): TkvParameter[] {
  return parameterDefinitions.map((paramDef) => ({
    checked: false,
    name: paramDef.name,
    pid: paramDef.paramId,
  }));
}

/**
 * Transforms SpfModuleDefinitionResponseDto to TKVParameter array
 * @param moduleDefinition - Module definition DTO
 * @returns Array of TKVParameter with checked set to false by default
 */
export function transformModuleDefinitionToTKVParameters(
  moduleDefinition: SpfModuleDefinitionResponseDto,
): TkvParameter[] {
  return transformParamDefinitionsToTKVParameters(
    moduleDefinition.paramDefinitionsSummaryInfo,
  );
}

/**
 * Transforms a single TagValueDefinitionInfo to ModuleTagKey value format
 * @param valueDto - Tag value definition from backend
 * @returns Transformed value object with id and name
 */
function transformTagValueDefinition(valueDto: TagValueDefinitionInfo): {
  id: number;
  name: string;
} {
  return {
    id: valueDto.valueId,
    name: valueDto.name,
  };
}

/**
 * Transforms a single TagKeyDefinitionInfo to ModuleTagKey format
 * @param keyDto - Tag key definition from backend
 * @returns Transformed ModuleTagKey object
 */
function transformTagKeyDefinitionToModuleTagKey(
  keyDto: TagKeyDefinitionInfo,
): ModuleTagKey {
  return {
    id: keyDto.keyId,
    name: keyDto.name,
    values: keyDto.values.map((value) => transformTagValueDefinition(value)),
  };
}

/**
 * Transforms an array of TagKeyDefinitionInfo to Record<string, ModuleTagKey> format
 * @param keyDefinitions - Array of tag key definitions from backend
 * @returns Record with key name as key and ModuleTagKey as value
 */
function transformTagKeyDefinitionsToModuleTagKeys(
  keyDefinitions: TagKeyDefinitionInfo[],
): Record<string, ModuleTagKey> {
  const result: Record<string, ModuleTagKey> = {};
  for (const keyDef of keyDefinitions) {
    result[keyDef.name] = transformTagKeyDefinitionToModuleTagKey(keyDef);
  }
  return result;
}

/**
 * Transforms a single TagDefinitionResponseDto to TagGroup format
 * @param tagDto - Tag definition from backend
 * @returns Transformed TagGroup object
 */
function transformTagDefinitionToTagGroup(
  tagDto: TagDefinitionResponseDto,
): TagGroup {
  return {
    id: tagDto.tagId,
    keys: transformTagKeyDefinitionsToModuleTagKeys(tagDto.keyDefinitions),
    name: tagDto.name,
  };
}

/**
 * Transforms an array of TagDefinitionResponseDto to Record<string, TagGroup> format
 * @param tagDefinitions - Array of tag definitions from backend
 * @returns Record with tag name as key and TagGroup as value
 */
export function transformTagDefinitionsToTagGroups(
  tagDefinitions: TagDefinitionResponseDto[],
): Record<string, TagGroup> {
  const result: Record<string, TagGroup> = {};
  for (const tagDef of tagDefinitions) {
    result[tagDef.name] = transformTagDefinitionToTagGroup(tagDef);
  }
  return result;
}
