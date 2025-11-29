---
name: pr-workflow
description: Workflow for creating pull requests with atomic commits and user approval. Use when implementing features, fixing bugs, or any code changes that should be committed and merged.
---

# PR Workflow

## Overview

Structured workflow for implementing changes with atomic commits, clear messaging, and user-approved PRs.

## Workflow

### 0. Plan first (for non-trivial changes)
Enter planning mode for features requiring design decisions or multi-file changes. Write plan to `docs/plans/plan-<feature>.md` and wait for user approval.

### 1. Branch from main
```bash
git checkout main && git pull
git checkout -b <type>/<feature-name>
```

Branch prefixes:
- `feat/` - new features
- `fix/` - bug fixes
- `refactor/` - no behavior change
- `docs/` - documentation only

### 2. Implement incrementally
- Make small, contained changes
- Atomic commit after each logical unit
- Clear commit message explaining the "why"
- Wait for user feedback before continuing

### 3. Commit format
```
<type>: <short description>

<optional body explaining why>
```

### 4. Create PR
```bash
git push -u origin <branch>
gh pr create --title "<title>" --body "<description>"
```

After creating, paste the PR link for user to review.

### 5. User approval
Wait for user to approve the PR before merging.

### 6. Merge and cleanup
```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

## Principles

- Changes should be small, contained, and atomic
- Code that is easy to follow and delete
- No premature abstractions
- Run tests before PR: `npm run test:run && npm run typecheck`
