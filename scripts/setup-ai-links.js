#!/usr/bin/env node
/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Sets up AI tool integration files after cloning.
 *
 * Run after cloning:  node scripts/setup-dev-links.js
 * Or via npm script:  pnpm run setup-dev-links
 *
 * Directory links (junction on Windows, symlink on Linux/macOS — no admin required):
 *   .agents/skills  →  .ai/skills   (for QGenie and similar tools)
 *   .claude/skills  →  .ai/skills   (for Claude Code project-level skill discovery)
 *
 * File copies (file symlinks require admin on Windows, so we copy instead):
 *   AGENTS.md  ←  .ai/context/CONTEXT.md
 *   CLAUDE.md  ←  .ai/context/CONTEXT.md
 */

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'fs';
import {createInterface} from 'readline/promises';
import {fileURLToPath} from 'url';
import {dirname, join, resolve} from 'path';
import {platform} from 'os';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const isWindows = platform() === 'win32';
const contextMd = join(repoRoot, '.ai', 'context', 'CONTEXT.md');

const dirLinks = [
  {
    from: join(repoRoot, '.agents', 'skills'),
    to: join(repoRoot, '.ai', 'skills'),
  },
  {
    from: join(repoRoot, '.claude', 'skills'),
    to: join(repoRoot, '.ai', 'skills'),
  },
];

const fileCopies = [join(repoRoot, 'AGENTS.md'), join(repoRoot, 'CLAUDE.md')];

/** Returns true if it's safe to replace `path` with a fresh symlink. */
async function canReplace(path) {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink()) {
    return true;
  }

  console.warn(`\n! ${shorten(path)} already exists as a real folder`);
  console.warn(`  contents: ${readdirSync(path).join(', ')}`);

  const rl = createInterface({input: process.stdin, output: process.stdout});
  const answer = await rl.question(
    '  Overwrite and permanently delete this folder? (y/N) ',
  );
  rl.close();

  if (answer.trim().toLowerCase() === 'y') {
    return true;
  }
  console.warn(`  Skipped — move or back up ${shorten(path)} and rerun.`);
  return false;
}

for (const {from, to} of dirLinks) {
  if (!(await canReplace(from))) {
    continue;
  }

  if (existsSync(from)) {
    rmSync(from, {recursive: true, force: true});
  }

  const parentDir = dirname(from);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, {recursive: true});
  }

  const linkType = isWindows ? 'junction' : 'dir';

  try {
    symlinkSync(resolve(to), from, linkType);
    console.log(`✓ ${shorten(from)} → ${shorten(to)}`);
  } catch (err) {
    console.error(`✗ Failed to create link ${shorten(from)}: ${err.message}`);
    if (isWindows) {
      console.error(
        '  On Windows, ensure Developer Mode is enabled or run as Administrator.',
      );
    }
    process.exit(1);
  }
}

for (const dest of fileCopies) {
  copyFileSync(contextMd, dest);
  console.log(`✓ ${shorten(dest)}  (copied from .ai/context/CONTEXT.md)`);
}

console.log('\nDone.');

function shorten(p) {
  return p.replace(repoRoot, '.').replace(/\\/g, '/');
}
