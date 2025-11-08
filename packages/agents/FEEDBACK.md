# Engineering Feedback & Guardrails

1. **Class-first modules** – Every significant TypeScript file should expose its functionality via a class (or a very small set of classes) rather than free functions for consistency and testability.
2. **Workflow ownership of agents** – All agent instances (Concierge, Author, ArtDirector, Illustrator) must be created and orchestrated exclusively inside the main workflow layer; other modules should never new-up agents directly.
3. **MainWorkflow expectations** – The workflow class should keep orchestration data-driven, avoid deeply nested conditionals, and expose configuration via getters so the `run` flow reads like a linear script.
4. **Chat plumbing** – Use the shared `CLIChat` implementation (or another `ChatInterface`) to manage readline loops. Specialized runners should inject a chat implementation rather than duplicating CLI logic elsewhere.
5. **Interface layout** – CLI and future entrypoints (API, MCP, etc.) live under `src/workflows/` alongside the main workflow so callers share one coordination layer.
6. **Naming conventions** – Continue using the studio metaphor (“Concierge”, “Author”, “ArtDirector”, “Illustrator”, “MainWorkflow”) across code, docs, and configuration files.
7. **Agent configuration** – Keep provider selection and env parsing within the agents domain (`agentSecrets` + adapters); avoid scattering model names in unrelated directories.
8. **Future TODO** – Add a chat interfaces directory when we expand beyond the CLI so reusable chat types stay organized.
