/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.xml'],
  base: '',
  build: {
    emptyOutDir: true,
    outDir: 'dist',
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    transformer: 'postcss',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '~assets': resolve(import.meta.dirname, './src/assets'),
      '~data': resolve(import.meta.dirname, './src/data'),
      '~entities': resolve(import.meta.dirname, './src/entities'),
      '~features': resolve(import.meta.dirname, './src/features'),
      '~shared': resolve(import.meta.dirname, './src/shared'),
      '~widgets': resolve(import.meta.dirname, './src/widgets'),
    },
  },
  server: {
    sourcemapIgnoreList: () => false,
  },
});
