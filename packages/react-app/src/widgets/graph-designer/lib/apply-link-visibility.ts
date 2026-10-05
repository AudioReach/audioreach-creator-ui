/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView} from '~entities/graph';

/**
 * Pure control/interUsecase link visibility filter.
 *
 * showControlLinks toggles all control links regardless of interUsecase state.
 * showInterUsecaseLinks toggles any link (data or control) with isInterUsecase
 * true, regardless of the control-link toggle. A non-interUsecase data link is
 * never affected by either flag.
 */
export function applyLinkVisibility(
  level: LevelView,
  showControlLinks: boolean,
  showInterUsecaseLinks: boolean,
): LevelView {
  if (showControlLinks && showInterUsecaseLinks) {
    return level;
  }

  const isVisible = (isInterUsecase: boolean | undefined, isControl: boolean) =>
    (isInterUsecase ? showInterUsecaseLinks : true) &&
    (isControl ? showControlLinks : true);

  return {
    ...level,
    controlLinks: (level.controlLinks ?? []).filter((l) =>
      isVisible(l.isInterUsecase, true),
    ),
    dataLinks: (level.dataLinks ?? []).filter((l) =>
      isVisible(l.isInterUsecase, false),
    ),
  };
}
