# Plan: Skill Workflows and Code Rules Hook

**Issues:** #44 (WORKFLOW sections), #47 (code rules hook)
**Branch:** `feat/skill-workflows-and-code-rules-hook`

---

## Goals

1. Add mandatory WORKFLOW section to all 5 skills with:
   - Numbered steps
   - ⏸️ Approval points
   - ⟳ Loop markers
   - Reflection instruction

2. Create code-rules skill with editing best practices

3. Create PreToolUse hook that reminds of code rules before Edit/Write

---

## Research Summary

| Source | Key Pattern | Adopted |
|--------|-------------|---------|
| Lee Hanchung | Wizard-style workflows with user confirmation | ✅ |
| diet103 | PreToolUse matcher `Edit\|Write`, stdout for context | ✅ |
| grahama1970 | Visual markers (emoji), compliance checklists | ✅ |
| Context7 | Exit 0 = continue, 2 = block | ✅ (use 0) |

**Rejected:** ASCII box art (hard to maintain), blocking hooks (too disruptive), Python complexity (bash suffices)

---

## WORKFLOW Template

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **STEP** - Description
   ⏸️ Wait for user approval

2. **STEP** - Description
   ⟳ Repeat until: condition

3. **STEP** - Final action
```

---

## Files to Change

### Skills (add WORKFLOW section + rename to verbs)

| Current Name | New Name | Steps | Key Approval Points |
|--------------|----------|-------|---------------------|
| `pr-workflow` | `pr-workflow` (keep) | 7 | Plan approval, PR approval |
| `agent-design` | `design-agent` | 5 | Schema design, implementation |
| `reflection` | `reflect` | 3 | None (output only) |
| `github-issues` | `create-issue` | 4 | Issue creation |
| `skill-creator` | `create-skill` | 5 | Skill design, hook design |

### New Files

| File | Purpose |
|------|---------|
| `.claude/skills/code-rules/SKILL.md` | Full code editing rules (no workflow) |
| `.claude/hooks/pre-edit-rules.sh` | PreToolUse hook - before edit reminder |
| `.claude/hooks/post-edit-rules.sh` | PostToolUse hook - after edit reminder |

### Renames (skill folders)

| From | To |
|------|-----|
| `.claude/skills/agent-design/` | `.claude/skills/design-agent/` |
| `.claude/skills/reflection/` | `.claude/skills/reflect/` |
| `.claude/skills/github-issues/` | `.claude/skills/create-issue/` |
| `.claude/skills/skill-creator/` | `.claude/skills/create-skill/` |

### Config Update

| File | Change |
|------|--------|
| `.claude/settings.json` | Add PreToolUse AND PostToolUse hooks for Edit\|Write |

---

## Hook Design

### PreToolUse Hook (before edit)

```bash
#!/bin/bash
# .claude/hooks/pre-edit-rules.sh
# PreToolUse: Remind of code rules BEFORE Edit/Write

echo "📋 PRE-EDIT: Read file first | Check data shapes | Simple > clever"
```

### PostToolUse Hook (after edit)

```bash
#!/bin/bash
# .claude/hooks/post-edit-rules.sh
# PostToolUse: Remind of next steps AFTER Edit/Write

echo "✅ POST-EDIT: Test with real data | Run typecheck before commit"
```

- **Non-blocking** (exit 0)
- **Short** (1 line each - more becomes noise)
- **Pre**: Reminds what to check before editing
- **Post**: Reminds what to do after editing

---

## Code Rules Skill Content

Extract from CLAUDE.md + session learnings:

1. **Philosophy** - Simple > clever, easy to delete
2. **Code style** - Pure functions, explicit types, .describe()
3. **Before editing** - Read file first, check data shapes
4. **Before committing** - Test with real data, run typecheck
5. **Collaboration** - Trust terse instructions, don't over-ask

---

## Implementation Order

1. Create code-rules skill (new - rules list)
2. Create pre-edit-rules.sh hook (new)
3. Create post-edit-rules.sh hook (new)
4. Update settings.json with both hooks
5. Rename + update agent-design → design-agent (add WORKFLOW)
6. Rename + update reflection → reflect (add WORKFLOW)
7. Rename + update github-issues → create-issue (add WORKFLOW)
8. Rename + update skill-creator → create-skill (add WORKFLOW + hooks step)
9. Update pr-workflow (add WORKFLOW)
10. Update CLAUDE.md skills references
11. Test hooks fire correctly
12. Create PR

---

## Test Strategy

- [ ] Hook fires on Edit tool
- [ ] Hook fires on Write tool
- [ ] Hook output is concise (not cluttering)
- [ ] Each skill has WORKFLOW at top
- [ ] WORKFLOWs have ⏸️ and ⟳ markers where appropriate

---

## Detailed WORKFLOW Drafts

### pr-workflow

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **Plan** - For non-trivial changes, enter planning mode and write to `docs/plans/`
   ⏸️ Wait for user approval of plan

2. **Branch** - Create branch from main: `git checkout -b <type>/<name>`

3. **Implement** - Make small changes, atomic commits with clear messages
   ⟳ Repeat: implement → commit → wait for feedback

4. **Test** - Run `npm run test:run && npm run typecheck`

5. **PR** - Push and create PR with `gh pr create`
   ⏸️ Wait for user to approve PR

6. **Merge** - `gh pr merge --squash --delete-branch`

7. **Reflect** - Invoke reflection skill for learnings
```

### design-agent (renamed from agent-design)

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **Understand** - Read existing schemas and agents in the area

2. **Schema first** - Define Zod schema with `.describe()` on ambiguous fields
   ⏸️ Review schema design with user

3. **Prompt** - Write system prompt with domain knowledge (not step-by-step)

4. **Implement** - Create agent as pure function, single transformation
   ⏸️ Review implementation with user

5. **Test** - Add tests for valid input, edge cases, malformed input
```

### reflect (renamed from reflection)

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **Review** - Scan full chat history for corrections, preferences, frustrations

2. **Analyze** - Note what worked, what caused friction, patterns

3. **Output** - Generate recommendations table with type, priority, change, why
```

### create-issue (renamed from github-issues)

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **Understand** - Clarify what the issue is about (bug, feature, refactor)

2. **Draft** - Write title and body with context, acceptance criteria
   ⏸️ Review issue content with user

3. **Create** - Run `gh issue create` with the drafted content

4. **Link** - If related to a PR, mention the issue number in PR description
```

### create-skill (renamed from skill-creator)

```markdown
## WORKFLOW

**Follow these steps. After each, state: "✓ Step N done. Next: Step N+1"**

1. **Purpose** - Define what the skill does and when to invoke it

2. **Design** - Draft SKILL.md with WORKFLOW, principles, references
   ⏸️ Review skill design with user

3. **Hooks** - Determine if skill needs PreToolUse/PostToolUse hooks
   ⏸️ Review hook design with user (if applicable)

4. **Create** - Write files to `.claude/skills/<name>/`
   ⟳ Repeat if user requests changes

5. **Test** - Verify skill appears in `/skills` and can be invoked
```

### code-rules (NEW) - Rules list, no workflow

```markdown
# Code Rules

**Strictly follow these rules when editing code.**

## Before Editing
- ALWAYS read the file before editing - never edit blind
- Check data shapes when connecting systems (id vs name mismatches)
- Understand existing patterns before modifying

## While Editing
- Simple > clever - choose simpler solution even if it feels "wasteful"
- Pure functions, immutability, no side effects
- Explicit types for data flowing between functions
- Keep functions small enough to fit in your head
- Write code that is easy to delete - loose coupling
- Don't abstract until you see the pattern three times

## Code Style
- Standalone exported functions, not classes
- 2-3 params: direct arguments; 4+: options object
- Prefer ternary on one line: `condition ? a : b`
- Use logger (pino) not console.log

## Before Committing
- Test with real data before committing optimizations
- Run `npm run typecheck` and `npm run test:run`
- One spike to validate assumptions - avoid fix-forward chains

## Collaboration
- Trust terse instructions - execute, don't over-ask
- Default to simpler solution
- User will course-correct quickly; don't debate, just iterate
```

---

## Acceptance Criteria

From #44:
- [ ] All 5 skills have WORKFLOW section
- [ ] Each workflow has numbered steps
- [ ] ⏸️ marks approval points
- [ ] ⟳ marks loops
- [ ] Reflection instruction present

From #47:
- [ ] code-rules skill created
- [ ] PreToolUse hook on Edit|Write
- [ ] Hook is non-blocking
- [ ] Rules are concise
