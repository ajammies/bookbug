# Updating CLAUDE.md
- One concept = one line, be concise
- Never remove or change lines without explicit instruction

# MCP
- Use context7 for code generation, setup, configuration, or library/API docs

# Bash commands
- `npm run dev` - run CLI in dev mode
- `npm run build` - compile TypeScript
- `npm run typecheck` - type check without emitting
- `npm run test:run` - run all tests once
- `npm run test:coverage` - generate coverage report

# Workflow
- Changes should be small, contained, and atomic
- New features: plan first → branch from main → atomic commits → run tests → create PR

# Planning
- Create plan in `/plans/plan-<feature-name>.md` and wait for user approval before implementing
- Plans include: goals, approach, files to change, test strategy

# Branch naming
- `feat/` new features, `fix/` bug fixes, `refactor/` no behavior change, `docs/` documentation, `chore/` maintenance

# Philosophy (Carmack-inspired)
- Make it as simple as possible, but not simpler
- Write code that is easy to delete - loose coupling, no tentacles across files
- Keep functions small enough to fit in your head
- Don't abstract until you see the pattern three times
- Prefer explicit over implicit - no magic

# Code style
- Pure functions, immutability, no side effects
- Standalone exported functions, not classes
- Data flows through parameters, not global state
- Intuitive file organization - things live where you'd expect

# Function design
- 2-3 params: direct arguments; 4+: options object
- One function, one job - if name has "and", split it
- External services injectable via optional params with factory defaults

# Types
- Explicit types for data flowing between functions
- Zod schemas for external API responses

# Agent design
- Never hardcode what an LLM can decide - use `generateObject`, not `if (text.includes(...))`
- One agent, one job - `detectApproval()` returns `{ isApproval: boolean }`, nothing else
- Schema-first - define Zod schema before prompt, schema IS the contract
- Prompts should be simple and clear, don't over-explain

# Testing
- Tests co-located: `file.ts` → `file.test.ts`
- Write tests first, confirm they fail, then implement
- Update tests when editing code, never leave stale
- Run `npm run test:run` and `npm run typecheck` before PR

# PR checklist
- [ ] No global mutable state
- [ ] Single-responsibility functions
- [ ] Dependency injection for external services
- [ ] Full test coverage for changes
- [ ] Intuitive file organization
- [ ] No premature abstractions
- [ ] Code is easy to delete
