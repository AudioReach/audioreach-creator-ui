/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

# Plan Output Format

This document defines the output contract for plans. Both writing-plans paths —
Path A (standard) and Path B (large-spec phased generation) — produce plans that
conform to this format.

Read this whenever you are about to write task content, regardless of which path
called you.

## Plan Document Header

Every plan MUST start with this header:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development
> (recommended) or executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `packages/react-app/src/[exact/path/to/file.tsx]`
- Modify: `packages/react-app/src/[exact/path/to/existing.ts]:[line range if relevant]`
- Test: `packages/react-app/tests/[exact/path/to/test.test.ts]`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```typescript
describe('functionName', () => {
  it('should return the expected value given valid input', () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- functionName.test.ts`
Expected: FAIL with "functionName is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
export function functionName(input: InputType): OutputType {
  return expected;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- functionName.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

  Use the `commit` skill to draft the commit message. Show the proposed message
  and the exact commands to the user and **wait for explicit confirmation** before
  running anything:

  ```bash
  git add [files changed]
  git commit -m "feat(react): [summary]" \
             -m "[Body explaining the motivation.]" \
             -m "Signed-off-by: [Name] <[email]>"
  ```

  **STOP — do not run `git commit` until the user explicitly approves the message.**
  Only execute after confirmation.
````

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

## Code Completeness by Task Type

Not all tasks require the same level of code detail. Use the right level — writing
more than needed inflates plans, and on Path B it also causes API timeouts in
subagents.

| Task type | Required level |
|---|---|
| DTO/type definition, pure utility function (`lib/`) | Full complete TypeScript — small and self-contained |
| Zustand store with a handful of actions | Full complete TypeScript — stores are declarative and short |
| Simple component (single render path, no branching) | Full complete TSX |
| **Complex component** (2+ states/branches, 80+ lines, or non-trivial hook logic) | **Skeleton only** — see below |
| Test file with complex fixture/mock setup | **Skeleton only** — see below |

## Skeleton Format for Complex Components and Tests

When a component has multiple states/branches (80+ lines of implementation) or a
test requires complex fixture setup, a detailed skeleton is acceptable instead of
full code. A good skeleton tells an engineer exactly what to implement; it is not
a placeholder.

The skeleton must include:
- Props/hook signature with full types
- Store selectors or hooks consumed
- Numbered steps with spec section references
- Return/render shape for each branch

**Example:**

```typescript
// packages/react-app/src/features/tree-view/ui/tree-node.tsx

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  onToggle: (nodeId: string) => void;
}

export function TreeNode({node, depth, onToggle}: TreeNodeProps) {
  // 1. Selector: useTreeViewStore(selectExpandedIds) — check node.id membership
  // 2. Branch A (leaf node, no children): render label + icon, no expand affordance
  // 3. Branch B (collapsed parent): render chevron-right, label, child count badge;
  //    onClick calls onToggle(node.id)
  // 4. Branch C (expanded parent): render chevron-down, label, recursively render
  //    TreeNode for each child in node.children with depth + 1
  // 5. Keyboard: ArrowRight expands, ArrowLeft collapses, per spec §4.2
}
```

The `executing-plans` skill fills in the TypeScript when running the task. An
engineer reading the skeleton knows what to implement without guessing.

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan
failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

The skeleton format above is *not* a placeholder — it is a detailed contract for
complex cases that lists every dependency, branch, and return shape.

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `docs/plans/<feature-name>/plan.md`. Two execution
options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review
between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans,
batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use subagent-driven-development
- Fresh subagent per task + two-stage review

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use executing-plans
- Batch execution with checkpoints for review
