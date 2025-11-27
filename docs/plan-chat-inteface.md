Overview

    Replace the static story-intake.ts with a conversational LLM-driven chat that:
    1. Accepts ANY user input (full stories, partial info, incremental answers)
    2. LLM interprets input and updates StoryBrief holistically
    3. LLM decides what to ask next based on gaps in the brief
    4. Each question includes AI-generated "chips" (suggested responses)
    5. User can select a chip or type custom input
    6. Loop continues until StoryBrief is complete

    Architecture

    User starts chat (optional initial message)
        ↓
    [LOOP START]
        ↓
    User provides input (any form: story paste, answer, description)
        ↓
    Interpreter Agent: userInput + currentBrief → updatedBrief
        ↓
    Conversation Agent: updatedBrief + history → { question, chips, isComplete }
        ↓
    If isComplete: return final StoryBrief
        ↓
    Display question + chips via @inquirer/select
        ↓
    User selects chip or enters custom
        ↓
    [LOOP BACK]

    Key Insight: Two-Agent Approach

    1. INTERPRETER AGENT - Extracts/updates StoryBrief from any user input
       - Input: user message (any format) + current partial brief
       - Output: updated Partial<StoryBrief>
       - Uses generateObject with StoryBriefSchema
       - Intelligently merges new info with existing brief
       - Handles full story pastes, partial updates, mixed responses

    2. CONVERSATION AGENT - Decides what to ask next
       - Input: current partial brief + message history
       - Output: { question, chips[], isComplete }
       - Analyzes what's missing or needs clarification
       - Generates contextual follow-up questions
       - No fieldToUpdate needed - interpretation is holistic

    Implementation Steps

    Step 1: Create conversation response schema

    Create a Zod schema for the Conversation Agent's response:

    // src/core/schemas/chat.ts
    const ConversationResponseSchema = z.object({
      question: z.string(),           // "What's your story about?"
      chips: z.array(z.string()),     // ["A brave puppy", "A magical garden", ...]
      isComplete: z.boolean(),        // true when StoryBrief has enough info
    });

    Note: No fieldToUpdate - the Interpreter handles all field mapping.

    Step 2: Create Interpreter Agent

    Agent that takes any user input and updates the StoryBrief:

    // src/core/agents/interpreter.ts
    export const interpreterAgent = async (
      userMessage: string,
      currentBrief: Partial<StoryBrief>
    ): Promise<Partial<StoryBrief>> => {
      const { object } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: StoryBriefSchema.partial(), // Allow partial updates
        system: INTERPRETER_SYSTEM_PROMPT,
        messages: [
          { role: 'system', content: `Current brief: ${JSON.stringify(currentBrief)}` },
          { role: 'user', content: userMessage }
        ],
      });

      // Merge new data with existing brief
      return { ...currentBrief, ...object };
    };

    System prompt instructs the LLM to:
    - Read the user's input (any format: full story, partial answer, mixed info)
    - Extract relevant information into StoryBrief fields
    - Preserve existing data from currentBrief
    - Update only fields that have new information
    - Infer character roles, settings, themes from context
    - Handle ambiguity gracefully (leave fields empty if unclear)

    Step 3: Create Conversation Agent

    Agent that decides what to ask next based on the current brief:

    // src/core/agents/conversation.ts
    export const conversationAgent = async (
      currentBrief: Partial<StoryBrief>,
      history: ModelMessage[]
    ): Promise<ConversationResponse> => {
      const { object } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: ConversationResponseSchema,
        system: CONVERSATION_SYSTEM_PROMPT,
        messages: [
          { role: 'system', content: `Current brief: ${JSON.stringify(currentBrief)}` },
          ...history
        ],
      });
      return object;
    };

    System prompt instructs the LLM to:
    - Analyze what fields are missing/incomplete
    - Ask one question at a time about the most important gap
    - Generate 3-4 contextually relevant chips
    - Set isComplete: true when required fields are filled
    - Be conversational and friendly
    - Adapt follow-up questions based on conversation history

    Step 4: Replace story-intake.ts with chat loop

    Rewrite src/cli/prompts/story-intake.ts:

    export async function runStoryIntake(
      initialMessage?: string
    ): Promise<StoryBrief> {
      let currentBrief: Partial<StoryBrief> = {};
      const history: ModelMessage[] = [];

      // Handle optional initial message (e.g., full story paste)
      if (initialMessage) {
        const spinner = ora('Understanding your story...').start();
        currentBrief = await interpreterAgent(initialMessage, currentBrief);
        spinner.stop();

        history.push(
          { role: 'assistant', content: 'Tell me about your story!' },
          { role: 'user', content: initialMessage }
        );
      }

      while (true) {
        // Get next question from conversation agent
        const spinner = ora('Thinking...').start();
        const response = await conversationAgent(currentBrief, history);
        spinner.stop();

        if (response.isComplete) {
          return buildFinalBrief(currentBrief);
        }

        // Display question and chips
        const choices = [
          ...response.chips.map(chip => ({ name: chip, value: chip })),
          new Separator(),
          { name: 'Enter custom response', value: '__CUSTOM__' },
        ];

        const answer = await select({
          message: response.question,
          choices,
        });

        const finalAnswer = answer === '__CUSTOM__'
          ? await input({ message: 'Your response:' })
          : answer;

        // Interpret user's answer and update brief
        const updateSpinner = ora('Processing...').start();
        currentBrief = await interpreterAgent(finalAnswer, currentBrief);
        updateSpinner.stop();

        // Update conversation history
        history.push(
          { role: 'assistant', content: response.question },
          { role: 'user', content: finalAnswer }
        );
      }
    }

    Helper function to validate and fill required fields:

    function buildFinalBrief(partial: Partial<StoryBrief>): StoryBrief {
      // Validate all required fields are present
      const result = StoryBriefSchema.safeParse(partial);

      if (!result.success) {
        throw new Error('Brief is incomplete: ' + result.error.message);
      }

      return result.data;
    }

    Step 5: Wire into CLI

    Update src/cli/commands/brief.ts to support optional initial message:

    // Allow user to provide story upfront or start fresh
    const initialStory = program.args[0]; // Optional positional arg

    const brief = await runStoryIntake(initialStory);
    // Continue with pipeline...

    Files to Modify

    | File                              | Action                        |
    |-----------------------------------|-------------------------------|
    | src/core/schemas/index.ts         | Add ConversationResponseSchema|
    | src/core/agents/interpreter.ts    | Create interpreter agent      |
    | src/core/agents/conversation.ts   | Create conversation agent     |
    | src/core/agents/index.ts          | Export both new agents        |
    | src/cli/prompts/story-intake.ts   | Replace with dual-agent loop  |
    | src/cli/commands/brief.ts         | Support optional initial msg  |

    Key Decisions

    1. Two-agent separation: Interpretation vs. Conversation concerns separated
    2. No fieldToUpdate: Interpreter uses schema-based extraction, handles any input
    3. Message history: Full conversation context for both agents
    4. Chip count: 3-4 chips per question (not overwhelming, enough variety)
    5. Completion detection: Conversation agent decides via isComplete flag
    6. Custom input: Always available as escape hatch
    7. Initial message support: Users can paste full story to start
    8. Merging strategy: Spread operator preserves existing + adds new data

    System Prompt Outline: Interpreter Agent

    You are a story information extractor. Your job is to read user input and extract
    relevant information into a structured StoryBrief.

    The user may provide:
    - A complete story in one message
    - An answer to a specific question
    - Mixed information spanning multiple fields
    - Vague or incomplete details

    Current brief: {currentBrief}

    Instructions:
    1. Extract any story-related information from the user's message
    2. Map it to the appropriate StoryBrief fields
    3. Preserve existing information from the current brief
    4. Only update fields where you have new/clearer information
    5. Infer details intelligently (e.g., a puppy protagonist → add to characters)
    6. Leave fields empty/unchanged if the user's input doesn't clarify them

    StoryBrief fields:
    - title: Story title
    - storyArc: Main theme/arc/plot
    - setting: Where the story takes place
    - ageRange: { min, max } target ages
    - pageCount: Number of pages
    - characters: Array of { name, description, role, traits, notes }
    - tone: Overall tone/mood
    - moral: Lesson or moral
    - interests: Child's interests to incorporate
    - customInstructions: Any special requests

    Return the updated brief with all relevant information extracted.

    System Prompt Outline: Conversation Agent

    You are a friendly children's book story designer helping users create a StoryBrief.

    Current brief: {currentBrief}
    Conversation history: {history}

    Your job:
    1. Analyze what's missing or unclear in the current brief
    2. Ask ONE question to fill the most important gap
    3. Generate 3-4 suggested answers ("chips") based on context
    4. Be conversational and adapt to the user's style

    Required fields: title, storyArc, setting, ageRange, characters (at least 1), pageCount
    Optional fields: tone, moral, interests, customInstructions

    When all required fields are filled and the story feels complete, set isComplete: true.

    Guidelines:
    - Keep questions focused and friendly
    - Generate chips that match the story's emerging theme
    - If the user already provided lots of info, ask about details (age range, page count)
    - If the user gave minimal info, ask about core story elements
    - Reference previous answers in your questions for continuity

    Example Usage Flows

    Flow 1: Full story paste

    User: "I want to write a story about a brave puppy named Max who goes on
           an adventure in a magical forest to find his lost bone. He meets
           a wise owl who helps him. It's for 4-6 year olds."

    → Interpreter extracts: title (inferred), storyArc, setting, characters (Max, owl),
                            ageRange
    → Conversation asks: "How many pages would you like? 📚"
                        Chips: ["12 pages (quick read)", "24 pages (standard)", "32 pages (longer)"]

    Flow 2: Incremental answers

    User: [starts chat with no message]

    → Conversation asks: "What's your story about? ✨"
                        Chips: ["A brave animal", "A magical place", "A friendship", "An adventure"]

    User: "An adventure"

    → Interpreter updates: storyArc = "An adventure"
    → Conversation asks: "Who is the main character in this adventure?"
                        Chips: ["A young child", "A curious animal", "A magical creature"]

    Flow 3: Mixed response

    User: "The story is about a little girl who lives in a castle"

    → Interpreter extracts: characters = [{ name: unknown, description: "little girl", role: "protagonist" }]
                           setting = "a castle"
    → Conversation asks: "What's the little girl's name?"
                        Chips: ["Princess Emma", "Knight Lily", "Wizard Clara", "Enter custom"]

    Why This Works

    ✅ Handles any input format (full stories, fragments, mixed info)
    ✅ No brittle regex or field mapping
    ✅ LLM interprets context and extracts intelligently
    ✅ Separation of concerns: interpretation vs. conversation
    ✅ Natural conversation flow with context awareness
    ✅ Flexible and extensible (easy to add new fields)
    ✅ Graceful handling of ambiguity
