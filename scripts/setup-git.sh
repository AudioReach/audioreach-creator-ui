#!/bin/bash

# AudioReach Creator - Git Configuration Setup Script
# This script configures git settings for maintaining linear history

echo "🔧 Setting up Git configuration for AudioReach Creator..."

# Set commit message template
echo "📝 Setting up commit message template..."
git config commit.template .gitmessage

# Configure rebase as default for pulls
echo "🔄 Configuring rebase as default for pulls..."
git config pull.rebase true

# Configure push behavior
echo "📤 Setting up push configuration..."
git config push.default simple

# Set up automatic rebase for new branches
echo "🌿 Configuring automatic rebase for branches..."
git config branch.autosetupmerge always
git config branch.autosetuprebase always

# Configure merge tool (optional)
echo "🛠️  Setting up merge tool..."
git config merge.tool vscode
git config mergetool.vscode.cmd 'code --wait $MERGED'

# Configure diff tool (optional)
echo "📊 Setting up diff tool..."
git config diff.tool vscode
git config difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'

# Set up useful aliases
echo "⚡ Setting up Git aliases..."

# Rebase shortcuts
git config alias.rb "rebase"
git config alias.rbi "rebase -i"
git config alias.rbc "rebase --continue"
git config alias.rba "rebase --abort"

# Status and log
git config alias.st "status"
git config alias.lg "log --oneline --graph --decorate"
git config alias.lga "log --oneline --graph --decorate --all"

# Branch management
git config alias.co "checkout"
git config alias.cob "checkout -b"
git config alias.br "branch"
git config alias.brd "branch -d"

# Safe force push
git config alias.pushf "push --force-with-lease"

# Update main and rebase current branch
git config alias.sync '!git checkout main && git pull && git checkout - && git rebase main'

# Show current configuration
echo ""
echo "✅ Git configuration complete! Current settings:"
echo ""
echo "📋 Core Settings:"
echo "   Commit template: $(git config commit.template)"
echo "   Pull rebase: $(git config pull.rebase)"
echo "   Push default: $(git config push.default)"
echo ""
echo "🌿 Branch Settings:"
echo "   Auto setup merge: $(git config branch.autosetupmerge)"
echo "   Auto setup rebase: $(git config branch.autosetuprebase)"
echo ""
echo "⚡ Available Aliases:"
echo "   git rb     - rebase"
echo "   git rbi    - rebase interactive"
echo "   git rbc    - rebase continue"
echo "   git rba    - rebase abort"
echo "   git st     - status"
echo "   git lg     - log with graph"
echo "   git lga    - log all branches with graph"
echo "   git co     - checkout"
echo "   git cob    - checkout new branch"
echo "   git br     - branch"
echo "   git brd    - delete branch"
echo "   git pushf  - force push with lease"
echo "   git sync   - update main and rebase current branch"
echo ""
echo "🎉 Setup complete! You can now use the configured git workflow."
echo ""
echo "📚 Next steps:"
echo "   1. Read CONTRIBUTING.md for workflow guidelines"
echo "   2. Use 'git sync' to update and rebase your current branch"
echo "   3. Use conventional commit messages (see .gitmessage template)"
echo ""
