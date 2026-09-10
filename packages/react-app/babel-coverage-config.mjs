/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function createBabelOptions(instrument, transformModules = false) {
  return {
    babelrc: false,
    configFile: false,
    plugins: [
      ...(transformModules ? ['@babel/plugin-transform-modules-commonjs'] : []),
      ...(instrument ? ['babel-plugin-istanbul'] : []),
    ],
    presets: [
      ['@babel/preset-react', {runtime: 'automatic'}],
      '@babel/preset-typescript',
    ],
    sourceMaps: true,
  };
}
