/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {glob} from 'glob';
import {access, unlink} from 'node:fs/promises';
import path from 'node:path';

const FFMPEG_PATTERNS = [
  '**/libffmpeg.so*',
  '**/ffmpeg.dll',
  '**/libffmpeg.dylib',
  '**/ffmpeg.dll',
];

export async function removeBinaries() {
  console.log('🔍 Scanning for FFmpeg libraries to remove...');

  const directories = [
    'out/win-unpacked',
    'out/linux-unpacked',
    'out/mac-unpacked',
    'dist',
  ];

  for (const dir of directories) {
    try {
      const matches = await glob(dir, {ignore: ['node_modules/**']});

      for (const matchDir of matches) {
        for (const pattern of FFMPEG_PATTERNS) {
          const ffmpegFiles = await glob(path.join(matchDir, pattern));

          for (const file of ffmpegFiles) {
            try {
              await access(file);
              await unlink(file);
              console.log(`✅ Removed: ${file}`);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              if (errorMessage !== 'ENOENT') {
                console.warn(`⚠️  Could not remove ${file}: ${errorMessage}`);
              }
            }
          }
        }
      }
    } catch (_error) {
      // Directory doesn't exist, skip
    }
  }

  console.log('✅ FFmpeg library removal completed');
}
