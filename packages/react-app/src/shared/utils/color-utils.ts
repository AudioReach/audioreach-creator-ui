/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

type GroupColorClasses = {
  background: string;
  border: string;
};

const GROUP_COLOR_CLASSES: GroupColorClasses[] = [
  {
    background: '!bg-category-blue-strong',
    border: 'border-[var(--color-category-blue-strong)]',
  },
  {
    background: '!bg-category-green-strong',
    border: 'border-[var(--color-category-green-strong)]',
  },
  {
    background: '!bg-category-lime-strong',
    border: 'border-[var(--color-category-lime-strong)]',
  },
  {
    background: '!bg-category-magenta-strong',
    border: 'border-[var(--color-category-magenta-strong)]',
  },
  {
    background: '!bg-category-orange-strong',
    border: 'border-[var(--color-category-orange-strong)]',
  },
  {
    background: '!bg-category-purple-strong',
    border: 'border-[var(--color-category-purple-strong)]',
  },
  {
    background: '!bg-category-red-strong',
    border: 'border-[var(--color-category-red-strong)]',
  },
  {
    background: '!bg-category-teal-strong',
    border: 'border-[var(--color-category-teal-strong)]',
  },
  {
    background: '!bg-category-violet-strong',
    border: 'border-[var(--color-category-violet-strong)]',
  },
  {
    background: '!bg-category-yellow-strong',
    border: 'border-[var(--color-category-yellow-strong)]',
  },
  {
    background: '!bg-category-amber-strong',
    border: 'border-[var(--color-category-amber-strong)]',
  },
];

export function getGroupColorClasses(colorId: number): GroupColorClasses {
  if (!Number.isInteger(colorId) || colorId < 1) {
    logger.warn(
      `Invalid color ID: ${colorId}. Falling back to the first category color.`,
      {
        action: 'getGroupColorClasses',
        component: 'color-utils',
      },
    );
    return GROUP_COLOR_CLASSES[0];
  }

  return GROUP_COLOR_CLASSES[(colorId - 1) % GROUP_COLOR_CLASSES.length];
}
