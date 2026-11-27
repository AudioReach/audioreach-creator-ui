/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {transformCkvsToConfiguredCkvs} from '~entities/key-configurator/lib/ckv.transform';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

import type {VcpmCkvDto} from '../model/vcpm.dto';

export function transformVcpmCkvsToConfiguredCkvs(
  ckvs: VcpmCkvDto[],
  keyDefinitionsByNaturalId: Record<number, GraphKey>,
): ConfiguredCkv[] {
  return transformCkvsToConfiguredCkvs(
    ckvs.map((ckv) => ({...ckv, supportedParameters: []})),
    keyDefinitionsByNaturalId,
  );
}
