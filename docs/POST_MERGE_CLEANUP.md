# Post-Merge Cleanup Guide

This guide explains how to handle your local branches after a PR has been squash merged, ensuring you maintain linear git history and avoid duplicate commits.

## Understanding the Problem

When a PR is **squash merged**, all commits from the feature branch are combined into a single new commit on the target branch. This creates a situation where:

- The original individual commits still exist in local branches
- These commits are now "orphaned" (not part of the main branch history)
- Developers with branches based on these commits need to clean up to avoid duplicates

## Visual Example

```
Before Squash Merge:
main:           X---Y---Z
feature-A:           \---A---B---C---D (PR ready)
feature-B:                   \---E---F (based on commit B)

After Squash Merge:
main:           X---Y---Z---S (A+B+C+D squashed into S)
feature-A:           \---A---B---C---D (orphaned commits)
feature-B:                   \---E---F (based on orphaned B)
```

**Problem**: If feature-B tries to merge normally, commits A and B will appear as duplicates.

## Cleanup Strategies

### Strategy 1: Interactive Rebase (Recommended)

**Best for**: When you have a few commits and want precise control

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Switch to your feature branch
git checkout feature-B

# 3. Start interactive rebase
git rebase -i origin/main

# 4. In the editor, you'll see something like:
# pick a1b2c3d commit A (duplicate - should drop)
# pick b2c3d4e commit B (duplicate - should drop)  
# pick c3d4e5f commit E (your work - keep)
# pick d4e5f6g commit F (your work - keep)

# 5. Change to:
# drop a1b2c3d commit A
# drop b2c3d4e commit B
# pick c3d4e5f commit E
# pick d4e5f6g commit F

# 6. Save and exit - git will apply only your unique commits
```

### Strategy 2: Reset and Cherry-pick (Safest)

**Best for**: When you want maximum safety and control

```bash
# 1. Create backup (safety first!)
git checkout feature-B
git checkout -b feature-B-backup

# 2. Update main
git checkout main
git pull origin main

# 3. Reset your branch to main
git checkout feature-B
git reset --hard origin/main

# 4. Cherry-pick only YOUR commits (E and F)
git cherry-pick c3d4e5f  # commit E
git cherry-pick d4e5f6g  # commit F

# 5. Force push (safe because you have backup)
git push --force-with-lease origin feature-B
```

### Strategy 3: Fresh Branch (Simplest)

**Best for**: When you want to start clean

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Create new branch from updated main
git checkout -b feature-B-v2

# 3. Cherry-pick your work or manually copy changes
git cherry-pick c3d4e5f d4e5f6g

# 4. Delete old branch (after confirming everything is good)
git branch -D feature-B
git push origin --delete feature-B

# 5. Rename new branch
git branch -m feature-B
git push -u origin feature-B
```

## Step-by-Step Cleanup Process

### Phase 1: Assessment

```bash
# Check what commits you have that aren't in main
git log --oneline origin/main..HEAD

# Check which commits were part of the merged PR
git log --oneline --graph --all
```

### Phase 2: Identify Your Work

Look at the commit list and identify:
- ✅ **Keep**: Commits that contain YOUR unique work
- ❌ **Drop**: Commits that were part of the squash-merged PR
- ⚠️ **Review**: Commits you're unsure about

### Phase 3: Execute Cleanup

Choose one of the three strategies above based on your comfort level and situation.

### Phase 4: Verification

```bash
# Verify your branch only contains your work
git log --oneline origin/main..HEAD

# Check for any duplicate content
git diff origin/main

# Ensure no merge commits exist
git log --oneline --merges
```

## Common Scenarios

### Scenario 1: Simple Case - All Your Commits After Merged Work

```bash
# Your branch: main + merged-commits + your-work
# Solution: Reset to main, cherry-pick your work
git reset --hard origin/main
git cherry-pick <your-commit-1> <your-commit-2>
```

### Scenario 2: Interleaved Commits

```bash
# Your branch: main + commit-A + your-commit + commit-B + your-commit
# Solution: Interactive rebase, drop A and B, keep yours
git rebase -i origin/main
# Mark A and B as 'drop', keep your commits as 'pick'
```

### Scenario 3: Merge Conflicts During Cleanup

```bash
# If conflicts occur during rebase/cherry-pick:
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git rebase --continue  # or git cherry-pick --continue
```

### Scenario 4: Accidentally Included Merged Work

```bash
# If you accidentally kept duplicate commits:
git rebase -i HEAD~n  # where n covers the duplicate commits
# Mark duplicates as 'drop' in the editor
```

## Prevention Best Practices

### For Individual Developers

1. **Rebase Daily**
   ```bash
   git sync  # Updates main and rebases current branch
   ```

2. **Keep PRs Small**
   - Smaller PRs = less chance of conflicts
   - Easier to coordinate merges

3. **Avoid Branching from Feature Branches**
   ```bash
   # Instead of:
   git checkout feature-A
   git checkout -b feature-B
   
   # Do:
   git checkout main
   git checkout -b feature-B
   ```

4. **Use Feature Flags for Large Features**
   - Merge incomplete features behind flags
   - Avoid long-lived feature branches

### For Teams

1. **Communicate Merges**
   ```bash
   # In team chat when merging:
   "🔀 Merged PR #123 (feature/audio-processing) into main
   📢 @dev1 @dev2 - please clean up dependent branches"
   ```

2. **Coordinate Merge Timing**
   - Establish "merge windows" for major features
   - Avoid merging during active development periods

3. **Track Branch Dependencies**
   - Document which branches depend on others
   - Use PR descriptions to note dependencies

## Troubleshooting

### "I Lost My Work!"

```bash
# Check reflog to find your commits
git reflog

# Find your commit hash and cherry-pick it
git cherry-pick <commit-hash>

# Or check your backup branch
git log feature-B-backup
```

### "I Have Duplicate Commits"

```bash
# Use interactive rebase to remove duplicates
git rebase -i origin/main
# Mark duplicates as 'drop'
```

### "Merge Conflicts During Cleanup"

```bash
# During rebase conflicts:
git status
# Edit conflicted files
git add .
git rebase --continue

# During cherry-pick conflicts:
git status  
# Edit conflicted files
git add .
git cherry-pick --continue
```

### "I'm Not Sure Which Commits Are Mine"

```bash
# Check commit authors
git log --oneline --format="%h %an %s" origin/main..HEAD

# Check commit dates
git log --oneline --since="2 days ago" origin/main..HEAD

# Compare with the merged PR
# (Check GitHub PR to see which commits were included)
```

## Team Communication Templates

### When Merging a PR

```
🔀 **PR Merged**: #123 - Add audio processing feature

**Squash merged into**: main
**Original commits**: a1b2c3d, b2c3d4e, c3d4e5f
**New commit**: f6g7h8i

**Action needed**: 
@dev1 @dev2 - Please clean up branches that depend on these commits:
- feature/audio-ui (depends on b2c3d4e)
- feature/audio-tests (depends on c3d4e5f)

**Cleanup guide**: See docs/POST_MERGE_CLEANUP.md
```

### When You Need Help

```
🆘 **Need cleanup help**

**Situation**: My branch `feature/xyz` was based on commits that got squash merged
**Merged PR**: #123
**My branch has**: 3 commits, 2 are duplicates, 1 is my work
**Status**: Unsure how to proceed

**Request**: Can someone help me identify which commits to keep?
```

## Quick Reference Commands

```bash
# Assessment
git log --oneline origin/main..HEAD        # See your commits
git log --oneline --graph --all            # See full history

# Cleanup (choose one)
git rebase -i origin/main                   # Interactive cleanup
git reset --hard origin/main && git cherry-pick <commits>  # Reset and cherry-pick
git checkout -b new-branch origin/main     # Fresh start

# Verification
git log --oneline origin/main..HEAD        # Verify only your work remains
git log --oneline --merges                 # Check no merge commits

# Safety
git checkout -b backup-branch              # Always create backup first
git reflog                                 # Find lost commits
```

## Related Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full git workflow guide
- [GIT_WORKFLOW_QUICK_REFERENCE.md](GIT_WORKFLOW_QUICK_REFERENCE.md) - Daily git commands
- [GITHUB_REPOSITORY_SETUP.md](GITHUB_REPOSITORY_SETUP.md) - Repository configuration

---

**Remember**: When in doubt, create a backup branch first! It's always easier to recover from a backup than to reconstruct lost work.
