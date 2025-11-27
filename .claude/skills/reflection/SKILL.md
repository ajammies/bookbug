---
name: reflection
description: End-of-session reflection for continuous improvement. Use when user asks to reflect, after merging PRs, or at session end. Outputs improvement recommendations table.
---

# Reflection

Analyze session and recommend improvements.

## Steps

1. Review full chat history for user feedback (corrections, preferences, frustrations)
2. Note what was accomplished and what caused friction
3. Output recommendations table

## Output

### Session Summary

Brief recap: what was done, what worked, what didn't.

### Recommendations

| Type | Priority | Change | Why |
|------|----------|--------|-----|
| `claude.md` | high | Add X | User corrected this twice |
| `skill` | medium | Update Y | Missing pattern |
| `new-skill` | low | Create Z | Repeated workflow |

## Reference

**Types:**
- `claude.md` — Project conventions
- `skill` — Update existing skill
- `new-skill` — New repeatable workflow

**Priority:**
- `high` — Caused errors or user corrections
- `medium` — Would help efficiency
- `low` — Nice to have
