# Plan: Unified Pipeline with Single Extractor

## Goal
Refactor the architecture so that:
1. Intake and plot phases are pipeline stages (not separate CLI flows)
2. Single extractor agent handles all input parsing
3. One unified Story schema filled progressively
4. Conversation is conditional - skip if data already present
5. Delete `cli/prompts/` - all logic lives in pipeline

## Current vs Proposed Architecture

**Current:**
```
CLI: story-intake.ts → StoryBrief
CLI: plot-intake.ts → StoryWithPlot
Pipeline: prose → visuals → render
```

**Proposed:**
```
Pipeline: [intake] → [plot] → [prose] → [visuals] → [render]
                ↑
         Single extractor fills unified Story
         Each stage skips if already filled
```

## Key Design Decisions

### 1. Unified Story Schema
Merge all composed types into one with optional fields.

### 2. Single Extractor Agent
One agent that parses any input into Story fields - replaces interpreterAgent and plotInterpreterAgent.

### 3. Stage Validators
Each pipeline stage has a validator to check if it can proceed (canSkipIntake, canSkipPlot, etc.).

### 4. Pipeline Stage Pattern
Each stage: check validator → skip or run conversation loop.

### 5. CLI Becomes Thin
CLI just calls pipeline with callbacks for user prompting.

## Implementation Phases

1. Schema Unification - unified Story type with validators
2. Extractor Agent - single agent for all input parsing
3. Pipeline Refactor - add intake/plot stages
4. CLI Cleanup - delete cli/prompts, simplify create.ts
5. Test & Cleanup - update tests and ARCHITECTURE.md

## Benefits

1. Paste full story → skips to render
2. Paste brief → skips intake
3. Start fresh → full conversation (same code path)
4. Resume works automatically
5. One extractor - no duplicate parsing logic
6. Simpler CLI
