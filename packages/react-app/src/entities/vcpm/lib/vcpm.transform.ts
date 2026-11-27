/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {transformCkvsToConfiguredCkvs} from '~entities/key-configurator/lib/ckv.transform';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

import type {VcpmCkvDto, VcpmConfiguredParamDto} from '../model/vcpm.dto';

export function transformVcpmCkvsToConfiguredCkvs(
  ckvs: VcpmCkvDto[],
  keyDefinitionsByNaturalId: Record<number, GraphKey>,
): ConfiguredCkv[] {
  return transformCkvsToConfiguredCkvs(
    ckvs.map((ckv) => ({...ckv, supportedParameters: []})),
    keyDefinitionsByNaturalId,
  );
}

// The list endpoint groups CKVs by parameter, so the same ckvSystemId can
// repeat across multiple configuredParams entries — dedupe before mapping
// to ConfiguredCkv.
export function transformVcpmConfiguredParamsToConfiguredCkvs(
  configuredParams: VcpmConfiguredParamDto[],
  keyDefinitionsByNaturalId: Record<number, GraphKey>,
): ConfiguredCkv[] {
  const uniqueCkvsBySystemId = new Map<string, VcpmCkvDto>();
  for (const param of configuredParams) {
    for (const associated of param.associatedCkvs) {
      if (!uniqueCkvsBySystemId.has(associated.ckvSystemId)) {
        uniqueCkvsBySystemId.set(associated.ckvSystemId, {
          keyValuePairs: associated.ckv,
          systemId: associated.ckvSystemId,
        });
      }
    }
  }
  return transformVcpmCkvsToConfiguredCkvs(
    [...uniqueCkvsBySystemId.values()],
    keyDefinitionsByNaturalId,
  );
}
