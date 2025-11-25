# MCP instructions
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

# Bash commands
- npm run dev: Run CLI in development mode
- npm run build: Compile TypeScript
- npm run typecheck: Type check without emitting
- npm run start: Run compiled CLI

# Workflow
- Make changes extremely small, contained, and atomic
- Tackle one thing at a time
- Prefer editing existing files over creating new ones
- Commit regularly after completing each small change

# Code style
- Follow functional principles: pure functions, immutability, no side effects
- Use classes/types to organize code - don't export random standalone functions
- Prefer static methods on classes over module-level functions (Haxe-style)
- Data flows through function parameters, not global state