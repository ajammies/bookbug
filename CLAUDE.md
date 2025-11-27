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
- New features: 
  - Enter Planning mode to create plan, write to `/plans/plan-<feature-name>.md` and wait for user approval
    - plan includes goals, approach, files to change, test strategy   
  - branch from main
  - implement features
    - atomic commit
    - clear git message to explain to user
    - wait for user feedback
    - repeat
  - evaluate changes according to CLAUDE.md and suggest improvements
  - run tests and fix issues
  - create PR and send link to user for approval 
  - merge pr
  - reflect on user feedback, and suggest new skills or claude.md changes


# Philosophy (Carmack-inspired)
- Make it as simple as possible, but not simpler
- Code that is easy to follow and read
- Write code that is easy to delete - loose coupling, no tentacles across files
- Keep functions small enough to fit in your head
- Don't abstract until you see the pattern three times
- Prefer explicit over implicit - no magic

# Code style
- Pure functions, immutability, no side effects, simple
- Explicit types for data flowing between functions
- think: can I simply make the first expression of this function return? 
- Standalone exported functions, not classes
- Data flows through parameters, not global state
- Intuitive file organization - things live where you'd expect
- 2-3 params: direct arguments; 4+: options object
- External services injectable via optional params with factory defaults
- Zod schemas for external API responses

# Branch naming
- `feat/` new features, `fix/` bug fixes, `refactor/` no behavior change, `docs/` documentation, 

# Agent design
- Never hardcode what an LLM can decide - use `generateObject`, not `if (text.includes(...))`
- One agent, one job - `detectApproval()` returns `{ isApproval: boolean }`, nothing else
- Schema-first - define Zod schema before prompt, schema IS the contract
- Trust the model - don't over-prescribe what it already understands (approval, extraction, conversation)
- Provide domain knowledge, not step-by-step instructions - the model knows how to converse
- Over-prescription causes overfitting - model follows rules rigidly instead of using intelligence

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
