# Prompting Guide for generateObject

## Table of Contents
- [System vs User Prompt](#system-vs-user-prompt)
- [Domain Knowledge vs Instructions](#domain-knowledge-vs-instructions)
- [Examples Over Explanations](#examples-over-explanations)
- [Prompt Patterns](#prompt-patterns)
- [Anti-Patterns](#anti-patterns)

## System vs User Prompt

**System prompt:** Role, context, domain knowledge, output guidelines
**User prompt:** The actual input data to transform

```typescript
await generateObject({
  model: getModel(),
  schema: OutputSchema,
  system: SYSTEM_PROMPT,  // Role and domain knowledge
  prompt: JSON.stringify(input, null, 2),  // Input data
});
```

## Domain Knowledge vs Instructions

**Bad - step-by-step instructions:**
```
1. First, read the story brief
2. Then, extract the title
3. Next, identify the main character
4. After that, determine the setting
5. Finally, format as JSON
```

**Good - domain knowledge:**
```
Write a complete manuscript from a StoryBlurb.

The blurb contains 5-6 structural beats (setup, conflict, rising_action, climax, resolution). Expand each beat into multiple pages based on pageCount.

For a 24-page book with 5 beats:
- Setup: ~4 pages (introduce world and character)
- Conflict: ~4 pages (establish the problem)
- Rising Action: ~6 pages (attempts and obstacles)
- Climax: ~4 pages (turning point)
- Resolution: ~6 pages (ending and lesson)

Writing guidelines by age:
- Ages 2-5: Simple words, rhythmic patterns, 1-2 sentences per page
- Ages 6-9: Longer sentences, more vocabulary, up to a paragraph
```

The model knows HOW to write. Tell it WHAT domain constraints exist.

## Examples Over Explanations

**Bad - verbose explanation:**
```
The plotBeats field should contain an array of objects where each object has a purpose field that is one of the following enum values: setup, conflict, rising_action, climax, or resolution. The purpose field indicates the narrative function of that beat in the overall story structure. Additionally, each object should have a description field that contains a string describing what happens during that beat.
```

**Good - concrete example:**
```
plotBeats (5-6 beats with purpose labels):
- setup: Introduce character, world, and status quo
- conflict: The problem, challenge, or inciting incident
- rising_action: Attempts, obstacles, escalation (can have 1-2 of these)
- climax: The turning point or biggest moment
- resolution: How it ends, what's learned
```

## Prompt Patterns

### Transformation Agent
```typescript
const SYSTEM_PROMPT = `Transform [input type] into [output type].

[Domain constraints and knowledge]

Output requirements:
- [Requirement 1]
- [Requirement 2]`;
```

### Conversation Agent
```typescript
const SYSTEM_PROMPT = `[Role description]. Ask questions to gather [information type].

Current state: [What we know so far]

Ask about:
- [Topic 1] if missing
- [Topic 2] if unclear

Provide helpful suggestions when appropriate.`;
```

### Interpreter Agent
```typescript
const SYSTEM_PROMPT = `Modify [data type] based on user feedback.

Users may reference items by [identifier type].

Rules:
- [Constraint 1]
- [Constraint 2]
- Preserve items the user didn't mention`;
```

### Generator Agent
```typescript
const SYSTEM_PROMPT = `Generate [output type] from [input type].

[Domain knowledge about the output format]

Guidelines by [context variable]:
- [Context 1]: [Guidelines]
- [Context 2]: [Guidelines]`;
```

## Anti-Patterns

### 1. Redundant Instructions
```
// Bad - model knows how to converse
"When the user says hello, respond with a greeting. When they ask a question, answer it."

// Good - provide context, trust conversational ability
"You are gathering story preferences from a parent creating a book for their child."
```

### 2. Over-Specifying Format
```
// Bad - fighting the schema
"Return a JSON object with the following structure: { title: string, ... }"

// Good - schema handles format, prompt handles content
"Create a story title that captures the adventure's spirit."
```

### 3. Conditional Logic in Prompts
```
// Bad - hardcoding decisions
"If the user mentions approval words like 'yes', 'okay', 'looks good', set isApproved to true."

// Good - let model understand intent
"Set isApproved=true when the user approves the current state."
```

### 4. Repeating Schema in Prompt
```
// Bad - redundant with schema
"The output should have: title (string), ageRange (object with min and max numbers)..."

// Good - trust schema, add context
"Title should be engaging for the target age range."
```

## Age-Appropriate Content

When generating content for children:

```typescript
const SYSTEM_PROMPT = `Writing guidelines by age:
- Ages 2-5: Simple words, rhythmic patterns, 1-2 sentences per page, gentle themes
- Ages 6-9: Longer sentences, more vocabulary, mild challenges, clear resolutions
- Ages 10-12: Complex narratives, nuanced emotions, age-appropriate conflict`;
```

## Prompt Length

- Keep prompts under 500 words
- Move detailed examples to schema `.describe()`
- Front-load the most important information
- Use bullet points for lists
