---
name: reflection
description: End-of-session reflection for continuous improvement. Use when the user asks to reflect on work done, proposes improvements, or at natural session endpoints after significant work. Triggers on "reflect", "what did we learn", "improve CLAUDE.md", or session wrap-up requests.
---

# Reflection

Structured end-of-session analysis to capture learnings and improve future work.

## When to Reflect

- User explicitly asks for reflection
- After merging a significant PR
- After completing a multi-step feature
- When patterns or anti-patterns emerge during work

## Reflection Framework

### 1. What Was Accomplished

List concrete deliverables:
- Files changed/created
- Features implemented
- Bugs fixed
- PRs merged

### 2. What Went Well

Identify effective patterns:
- Approaches that worked
- Tools used effectively
- Communication that helped

### 3. What Could Be Improved

Identify friction points:
- Mistakes made (and root cause)
- Time wasted on preventable issues
- Missing context or tools

### 4. Proposed Improvements

For each improvement, specify the target:

| Target | When to Use |
|--------|-------------|
| CLAUDE.md | Project-wide conventions, workflows, commands |
| Existing skill | Domain-specific guidance that needs updating |
| New skill | Repeatable workflow not yet captured |
| User feedback | Behavioral changes for future sessions |

### 5. Format Proposals

**CLAUDE.md additions** - Use this format:
```markdown
# Section Name
- One line per concept
- Be concise
```

**Skill updates** - Use skill-creator skill to modify

**New skills** - Use skill-creator skill to create

## Output Structure

Present reflection as a table + proposals:

```markdown
## Session Reflection

| Category | Details |
|----------|---------|
| Accomplished | [bulleted list] |
| Went well | [patterns] |
| Could improve | [friction points] |

## Proposed Improvements

### CLAUDE.md
[specific additions in markdown format]

### Skills
[updates or new skills needed]

### For Next Time
[behavioral changes to remember]
```

## Anti-Patterns to Avoid

- Vague reflections ("things went well")
- Improvements without specific targets
- Proposals that duplicate existing guidance
- Over-engineering simple observations
