---
name: github-issues
description: |
  Use this skill when: creating issues, viewing issues, resolving issues, or linking issues to PRs.
  Also use PROACTIVELY when encountering bugs or features to track later.
---

# GitHub Issues

## Commands

### Create Issue
When user says "make an issue" or similar with brief context:
1. Infer title, body, and priority from context
2. Create comprehensive issue with `gh issue create`
3. Apply priority label if specified

```bash
gh issue create --title "<title>" --body "<body>" --label "priority:<level>"
```

### View Issues
When user asks to see issues:
1. Fetch open issues with `gh issue list`
2. Format as markdown table
3. Recommend which to work on based on priority and age

### Resolve Issue
When closing an issue:
```bash
gh issue close <number> --reason completed
```

### Link to PR
When creating PRs, reference issues:
```bash
gh pr create --title "<title>" --body "Closes #<issue>"
```

## Priority Levels
- `priority:high` - Blocking or critical
- `priority:medium` - Should do soon
- `priority:low` - Nice to have

## Proactive Mode
When encountering bugs or features during work:
- Suggest: "Want me to create an issue to track this?"
- Use context to pre-fill issue details
