/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

# Large Spec Phased Generation (Path B)

Use this when the caller provides a **handoff file**. This is Path B of the writing-plans skill — selected from `SKILL.md` based on whether a handoff file is present.

The purpose of this path is to avoid filling the main session with spec text, codebase files, and CLAUDE.md content. Those reads happen inside subagents instead, one chapter at a time. The main session orchestrates and assembles.

## What the handoff file contains

The handoff file (written by the brainstorming skill at step 10) contains:
- Spec file path
- Plan output path
- Scope note (e.g. which sections are in scope)
- Chapter partition: names, spec section references, batch grouping, task start numbers

## Rules for the main session

**Allowed before first Agent call:** one Read of the handoff file. Nothing else.

**Not allowed before first Agent call:**
- Reading the spec
- Reading the codebase
- Running Explore agents
- Reading CLAUDE.md or package.json
- Reading any file for "patterns"

Subagents handle all of that themselves. The main session passes paths and section references only — no file content.

## Output contract

Plans produced by this path conform to `plan-format.md` (sibling file in this `references/` directory). The main session does not need to re-read its rules — subagents do, because they author the task content. The main session uses `plan-format.md` only to copy the Plan Document Header template (Step 5) and the Execution Handoff block (Step 5 footer).

## Step 1 — Read the handoff file

One Read call. That is the only file read the main session performs.

## Step 2 — Fire batch 1 agents immediately

No analysis, no summaries, no explanatory text. The next action after reading the handoff file is Agent tool calls.

## Step 3 — Dispatch subagents

One general-purpose subagent per chapter. **Hard limit: no more than 8–10 tasks per subagent.** If a chapter in the handoff file would produce more than 10 tasks, split it into two subagents covering different sections before dispatching. Run the two sub-chapters sequentially within the batch.

## Step 3b — Subagent prompt requirements

Each subagent prompt must include:

- **Spec scope.** The spec file path and exact section headings to process (e.g. "Sections 3.1–3.2"). The subagent reads the spec itself.
- **Project context source.** The CLAUDE.md path. The subagent reads it itself to learn FSD layer rules, naming conventions, and test commands.
- **Output format reference.** The absolute path to `plan-format.md`. Tell the subagent: "Follow this file's Task Structure, Bite-Sized Task Granularity, Code Completeness by Task Type, Skeleton Format for complex components, and No Placeholders rules. The format file is the single source of truth — do not paraphrase from memory."
- **Chapter scope statement.** "Write only the tasks for [chapter name]. Do not write the plan-level header — the main session writes that during assembly."
- **Task number range.** The starting task number so numbering is contiguous when assembled. Example: "Number your tasks starting at Task 12."
- **Output file path.** A chapter file under the same plan directory as the final plan, in a `chapters/` subdirectory: `docs/plans/<feature>/chapters/<batch>-<chapter>-<slug>.md` (zero-padded, e.g. `01-01-entities.md`). The handoff file's `Plan output` field gives you `<feature>` — use the same value. The subagent writes its tasks to that file. It does not return plan content as text — that would refill the main session's context.
- **Codebase read budget.** "Read at most 2–3 existing codebase files as patterns. Choose the most similar existing entity, store, component, or test. Do not explore the codebase broadly."

## Step 4 — Batching rules

Run subagents in **foreground** (never `run_in_background: true` — background agents queue silently and show 0 tokens).

Send 2–3 independent chapters as parallel calls in a single message. Wait for the batch to complete before sending the next batch. Run a chapter sequentially only when its types depend on output from a prior chapter.

**Typical dependency order for an FSD feature** (mirrors the batch-grouping rules in `brainstorming/SKILL.md` Step 10):

| Batch | Chapters | Can be parallel |
|---|---|---|
| 1 | Entities & DTOs, Shared utilities (`lib/`) | Yes |
| 2 | Zustand stores | No — depends on entity types from batch 1 |
| 3 | Feature components | No — depends on stores from batch 2 |
| 4 | Widgets | No — depends on feature components from batch 3 |
| 5 | Unit tests, Integration tests | Yes (after batch 4) |

Merge adjacent chapters if either has fewer than 3 tasks.

## Step 5 — Assemble

Once all batches complete, concatenate chapter files. Do not read their content into the session — use a shell command. Substitute `<plan-output-path>` with the `Plan output` field from the handoff file (e.g. `docs/plans/virtual-links/virtual-links.md`) and `<chapters-dir>` with its sibling `chapters/` directory (e.g. `docs/plans/virtual-links/chapters/`). The header template comes from `plan-format.md`; copy it verbatim and fill in the bracketed fields from the handoff file:

```bash
# Write the plan header (template from references/plan-format.md)
cat > <plan-output-path> << 'EOF'
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development
> (recommended) or executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** [from handoff file]

**Architecture:** [from handoff file or spec scope note]

**Tech Stack:** TypeScript, React, Vite, TailwindCSS, Zustand, Jest

---
EOF

# Append all chapter files in order
cat <chapters-dir>/*.md >> <plan-output-path>

# Clean up scaffolding
rm -rf <chapters-dir>
```

Then present the Execution Handoff block from `plan-format.md` to the user. Wait for their selection.

## Self-review

Skip the self-review on the assembled plan. Each subagent was responsible for placeholder and type-consistency checks within its chapter. If the user reports a cross-chapter consistency problem after reviewing, fix the relevant chapter task directly in the plan file.
