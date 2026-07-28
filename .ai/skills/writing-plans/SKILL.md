---
name: writing-plans
description: "Produces comprehensive, TDD-driven implementation plans from specs or requirements, with exact file paths, complete code in every step, and commit checkpoints. Use when the user has a spec or requirements document for a multi-step task and needs a structured plan before touching code."
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `using-git-worktrees` skill at execution time.

**Save plans to:** `docs/plans/<feature-name>/plan.md`
- (User preferences for plan location override this default)

## Choose a Path

This skill has two paths. Decide which applies, then follow exactly one path
end-to-end.

**Path A — Standard plan.** The caller hands you a spec or requirements
document directly and you can read the codebase to inform the plan. Continue
with the sections below in this file.

**Path B — Large-spec phased generation.** The caller provides a **handoff
file** (e.g. `Handoff file: docs/plans/<feature>/<topic>-plan-handoff.md`).
The handoff file is produced by the brainstorming skill and partitions a
large spec into chapters for parallel subagent generation. Go to
`references/large-spec-phased-generation.md` and follow it exactly.
**Do not execute Path A** — Path A would force the main session to read the
spec and codebase files directly, which is exactly what Path B avoids in
order to stay within context and avoid API timeouts on large specs.

**Output contract for both paths:** `references/plan-format.md` defines the
plan header, task structure, no-placeholder rules, code-completeness-by-task-
type table, and the skeleton format for complex components. Read it before
writing any task content, regardless of which path you're on.

---

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a
fresh reviewer's gate. When drawing task boundaries: fold setup,
configuration, scaffolding, and documentation steps into the task whose
deliverable needs them; split only where a reviewer could meaningfully
reject one task while approving its neighbor. Each task ends with an
independently testable deliverable.

## Writing Tasks

Follow `references/plan-format.md` for the plan header, task structure,
bite-sized granularity, code-completeness-by-task-type table, the skeleton
format for complex components, and the no-placeholders rules. Do not
paraphrase it from memory — read the file.

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section in `references/plan-format.md`. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, follow the "Execution Handoff" section in
`references/plan-format.md` — offer Subagent-Driven vs. Inline Execution and
invoke the matching required sub-skill.
