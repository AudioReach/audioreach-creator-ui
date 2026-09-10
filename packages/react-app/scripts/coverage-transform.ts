/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {transformSync} from '@babel/core';
import type {Plugin} from 'vite';

import {createBabelOptions} from '../babel-coverage-config.mjs';

const sourcePattern = /[\\/]src[\\/].+\.(?:js|jsx|ts|tsx)$/;

export function createCoveragePlugin(enabled: boolean): Plugin {
  return {
    enforce: 'pre',
    name: 'shared-coverage-transform',
    transform(code, id) {
      if (!enabled || !sourcePattern.test(id)) {
        return null;
      }

      const result = transformSync(code, {
        ...createBabelOptions(true),
        filename: id,
        sourceFileName: id,
      });

      if (!result?.code) {
        throw new Error(`Coverage transform produced no code for ${id}`);
      }

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}
