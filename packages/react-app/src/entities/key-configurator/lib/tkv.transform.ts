/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TagInfoDto} from '~entities/spf-module-data';
import type {
  TagDefinitionResponseDto,
  TagKeyDefinitionInfo,
  TagValueDefinitionInfo,
} from '~entities/key-definitions/model/key-definition.dto';
import type {
  ConfiguredTkv,
  GraphKey,
  KeyValue,
  TagGroup,
} from '~shared/types/key-configurator-config.types';

function transformTagValueDefinition(
  valueDto: TagValueDefinitionInfo,
): KeyValue {
  return {
    id: valueDto.naturalId,
    name: valueDto.name,
    systemId: valueDto.systemId,
  };
}

function transformTagKeyDefinition(keyDto: TagKeyDefinitionInfo): GraphKey {
  return {
    id: keyDto.naturalId,
    name: keyDto.name,
    systemId: keyDto.systemId,
    values: keyDto.values.map(transformTagValueDefinition),
  };
}

function transformTagDefinitionToTagGroup(
  tagDto: TagDefinitionResponseDto,
): TagGroup {
  return {
    id: tagDto.naturalId,
    keys: (tagDto.keyDefinitions ?? []).reduce<Record<string, GraphKey>>(
      (acc, keyDef) => {
        acc[keyDef.name] = transformTagKeyDefinition(keyDef);
        return acc;
      },
      {},
    ),
    name: tagDto.name,
    systemId: tagDto.systemId,
  };
}

export function transformTagDefinitionsToTagGroups(
  tagDefinitions: TagDefinitionResponseDto[],
): Record<string, TagGroup> {
  return tagDefinitions.reduce<Record<string, TagGroup>>((acc, tagDef) => {
    acc[tagDef.name] = transformTagDefinitionToTagGroup(tagDef);
    return acc;
  }, {});
}

export interface TagDefinitionLookupEntry {
  tagGroup: TagGroup;
  tagGroupId: number;
  tagGroupName: string;
}

export function buildTagDefinitionLookup(
  moduleTagKeys: Record<string, TagGroup>,
): Record<string, TagDefinitionLookupEntry> {
  return Object.values(moduleTagKeys).reduce<
    Record<string, TagDefinitionLookupEntry>
  >((acc, tagGroup) => {
    acc[tagGroup.id] = {
      tagGroup,
      tagGroupId: tagGroup.id,
      tagGroupName: tagGroup.name,
    };
    return acc;
  }, {});
}

export function transformTagsToConfiguredTkvs(
  tags: TagInfoDto[],
  tagDefinitionsByNaturalId: ReturnType<typeof buildTagDefinitionLookup>,
): ConfiguredTkv[] {
  const configuredTkvs: ConfiguredTkv[] = [];
  for (const tag of tags) {
    const tagDefinition = tagDefinitionsByNaturalId[tag.naturalId];
    const tagGroupName = tagDefinition?.tagGroupName ?? tag.tagName;

    if (!tag.tkvs || tag.tkvs.length === 0) {
      // A tag with no key-value pairs is a "module tag" — it has no PIDs
      // to configure, but still needs a row in Configured TKVs so it's
      // visible and survives an instance reselect.
      configuredTkvs.push({
        keyValuePairs: [],
        pidConfig: [],
        systemId: tag.systemId,
        tagGroup: tagGroupName,
        tagGroupId: tag.naturalId,
      });
      continue;
    }

    for (const tkv of tag.tkvs) {
      configuredTkvs.push({
        keyValuePairs: tkv.keyValuePairs.map((kv) => ({
          key: {
            id: kv.key.naturalId,
            name: kv.key.name,
            systemId: kv.key.systemId,
          },
          value: {
            id: kv.value.naturalId,
            name: kv.value.name,
            systemId: kv.value.systemId,
          },
        })),
        pidConfig: tkv.supportedParameters.map((param) => param.naturalId),
        systemId: tkv.systemId,
        tagGroup: tagGroupName,
        tagGroupId: tag.naturalId,
      });
    }
  }
  return configuredTkvs;
}
