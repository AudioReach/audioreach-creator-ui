/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView} from '~entities/graph';

/**
 * Pure PP-module highlight stamp. Marks each module whose definition system id
 * is in ppModuleDefinitionIds as isPpModule: true. Purely visual — no effect on
 * node size, so this runs post-layout, never triggering a relayout when toggled.
 */
export function applyPpHighlight(
  level: LevelView,
  ppModuleDefinitionIds: ReadonlySet<string>,
): LevelView {
  if (ppModuleDefinitionIds.size === 0) {
    return level;
  }

  return {
    ...level,
    modules: (level.modules ?? []).map((m) =>
      m.moduleDefinitionSystemId &&
      ppModuleDefinitionIds.has(m.moduleDefinitionSystemId)
        ? {...m, isPpModule: true}
        : m,
    ),
  };
}
