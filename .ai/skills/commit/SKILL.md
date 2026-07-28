---
name: commit
description: "Generates, validates, and executes Conventional Commits-format git commit messages with atomicity checking and author identity resolution. Use when the user is writing, drafting, or reviewing a git commit message, when asked to commit changes, when a PR reviewer flags a commit message, or when the user is unsure about title length, body format, Signed-off-by placement, or commit atomicity."
---


## Procedure

**Silent execution: The ONLY output is the commit message and the options question.
Do not print rules, steps, reasoning, thinking, or any commentary. Everything else
happens silently in your head.**

### 1. Gather context

Before drafting you need two things: **(a) what changed** and **(b) why it was needed**.

Review the information already in your context from this session — what the user
has described, code you have written, and changes you have made. **Do not run any
git commands to gather context.** If both (a) and (b) are present, proceed directly
to drafting.

If either is missing, ask:
> *"What changed, and why was this change needed?"*

Do not invent or assume details. Do not proceed until you have both.

### 2. Resolve author identity

```bash
git config user.name
git config user.email
```

Use the returned values in `Signed-off-by:`. If either is empty or the command
fails, ask the user for their name and email.
**Never emit a placeholder** like `Your Name <your.email@example.com>`.

### 3. Check atomicity

One logical change belongs in one commit — regardless of diff size. Renaming a
function across 50 files is still one logical change. A bug fix touching 3 lines
that also reformats whitespace is two changes.

If the changes span unrelated concerns (e.g., bug fix + refactor + dependency bump), say:
> *"These changes cover more than one concern. Which should this commit describe?"*

Do not silently bundle unrelated changes.

### 4. Draft and self-validate

Draft following the format and rules below, then check every item before presenting:

- [ ] Subject line follows `type(scope): summary` format
- [ ] Type is one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- [ ] Scope matches one of the scopes listed in `.gitmessage` at the repo root
- [ ] Subject ≤50 characters (not counting `type(scope): `)
- [ ] Subject uses imperative mood, lowercase first letter, no period
- [ ] Blank line between subject and body
- [ ] Body explains *why* (motivation, contrast with previous behavior) — not just *what*
- [ ] Body is prose — complete sentences in flowing paragraphs, no bullet points, no numbered lists, no sentence-per-line fragments
- [ ] Lines wrap at 72 columns
- [ ] `Signed-off-by:` present with real name and email, after the body

Fix any failure before presenting.

### 5. Present with options

Show the commit message in a code block. Then use `ask_followup_question` with:

- **Accept** — always
- Up to 3 alternatives — only if genuinely different (different emphasis, detail,
  or angle); describe each in a short phrase from the actual content; omit if none

If the user types a request instead of clicking → apply it, return to Step 4, re-present.

**HARD RULE: Do NOT run `git commit` or any git write command until the user
explicitly selects "Accept" (or equivalent confirmation) in Step 6. Presenting
the message is not permission to commit.**

### 6. Execute commit (only after explicit user confirmation)

Once the user selects **Accept**:

1. Show the exact commands about to be run. Use multiple `-m` flags for the
   multi-line format this repo requires:

```bash
git add <files>
git commit -m "feat(react): add specific feature" \
           -m "Body explaining the motivation and what changed." \
           -m "Signed-off-by: Name <email>"
```

2. Run the commands.
3. Show the resulting commit hash (output of `git log -1 --oneline`).

If the user selects an alternative or requests changes instead, return to Step 4.

---

## Format

Use Conventional Commits: `type(scope): summary` — see `.gitmessage` at the repo
root for the full list of valid types and scopes.

```
feat(react): add graph search with prefix syntax

The usecase visualizer had no way to jump to a specific node without
scrolling through the whole graph. Larger diagrams made this painful
once node counts grew past a screen's worth.

This adds a search box that filters by label prefix and centers the
view on the first match.

Signed-off-by: Jane Developer <jane@example.com>
```

**Multi-line commit command** (this repo requires a body — never use a single
`-m` flag alone):

```bash
git commit -m "feat(react): add graph search with prefix syntax" \
           -m "Body text here." \
           -m "Signed-off-by: Jane Developer <jane@example.com>"