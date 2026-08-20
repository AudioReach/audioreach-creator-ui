/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  QdsBrand as BrandValues,
  QdsTheme as ThemeValues,
  type QdsBrand,
  type QdsTheme,
} from '@qualcomm-ui/qds-core/theme';

export type Brand = QdsBrand;

export type Theme = QdsTheme;

export type Appearance = {
  brand: Brand;
  theme: Theme;
};

export const Brand = BrandValues;

export const Theme = ThemeValues;
