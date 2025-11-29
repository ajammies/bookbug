---
name: code-rules
description: Code editing rules. Reference before complex edits.
---

# Code Rules

## Philosophy

- Always make it as simple as possible, but not simpler
- Always write code that is easy to follow and read
- Always write code that is easy to delete - loose coupling, no tentacles across files
- Always keep functions small enough to fit in your head
- Do not abstract until you see the pattern three times
- Always prefer explicit over implicit - no magic

## Writing Code

- Always use pure functions, immutability, no side effects
- Always use explicit types for data flowing between functions
- Always use standalone exported functions, not classes
- Always flow data through parameters, not global state
- Use 2-3 params as direct arguments; 4+ use options object
- Always use logger (pino) not console.log

## Refactoring

- Always check data shapes when connecting different parts of system (id vs name mismatches)
- Always keep intuitive file organization - things live where you'd expect
- Always make external services injectable via optional params with factory defaults

## Testing

- Always co-locate tests: `file.ts` → `file.test.ts`
- Always run `npm run test:run` and `npm run typecheck` before PR
- Always test with real data before committing performance optimizations

## Collaboration

- Trust terse instructions - execute, do not over-ask
- Always default to simpler solution even if it feels "wasteful"
- Do one spike to validate assumptions, then commit - avoid fix-forward chains
