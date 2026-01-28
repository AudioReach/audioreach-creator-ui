## Description

Brief description of the changes made in this PR.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Chore (maintenance, refactoring, etc.)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test changes

## Package/Scope

- [ ] `react` - React frontend application
- [ ] `electron` - Electron main process and preload scripts
- [ ] `api-utils` - Shared types and IPC utilities
- [ ] `workspace` - Monorepo/workspace configuration
- [ ] `docs` - Documentation changes

## Testing

- [ ] Unit tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Code Quality Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation have been made
- [ ] Changes generate no new warnings
- [ ] Any dependent changes have been merged and published

## Git History

- [ ] Commits follow conventional commit format
- [ ] Commit messages are clear and descriptive
- [ ] Branch is rebased on latest main (no merge conflicts)
- [ ] History is clean (squashed/organized appropriately)

## Screenshots (if applicable)

<!-- Add screenshots here for UI changes -->

## Related Issues

<!-- Link to related issues using keywords like "Closes #123" or "Fixes #456" -->

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Merge Strategy

For this PR, I recommend:

- [ ] **Squash and merge** (for small features, bug fixes, or when commits are not well-organized)
- [ ] **Rebase and merge** (for well-crafted commits that tell a story)

**Reason:** <!-- Explain why you chose this merge strategy -->

## Branch Dependencies

- [ ] This branch is based only on `main` (no cleanup needed after merge)
- [ ] This branch is based on other feature branches (cleanup may be needed)

**Dependent branches:** <!-- List any branches that depend on this one -->

- `feature/branch-name` (depends on commits: abc123, def456)

## Post-Merge Actions

If this PR gets **squash merged**, the following developers need to clean up their branches:

- [ ] No dependent branches (no action needed)
- [ ] @developer1 - cleanup needed for `feature/branch-name`
- [ ] @developer2 - cleanup needed for `feature/other-branch`

**Cleanup guide:** [POST_MERGE_CLEANUP.md](../docs/POST_MERGE_CLEANUP.md)

**Notification template:**

```
🔀 PR #XXX merged (squash) into main
📢 @dev1 @dev2 - cleanup needed for dependent branches
📖 Guide: docs/POST_MERGE_CLEANUP.md
```
