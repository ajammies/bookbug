Overview

     Replace the static story-intake.ts with a conversational LLM-driven chat that:
     1. LLM decides what to ask next based on what's missing from the StoryBrief
     2. Each question includes AI-generated "chips" (suggested responses)
     3. User can select a chip or type custom input
     4. Loop continues until StoryBrief is complete

     Architecture

     User starts chat
         ↓
     LLM analyzes current partial StoryBrief
         ↓
     LLM generates: { question, chips[], fieldToUpdate }
         ↓
     Display question + chips via @inquirer/select
         ↓
     User selects chip or enters custom
         ↓
     Update partial StoryBrief
         ↓
     Loop until complete → return StoryBrief

     Implementation Steps

     Step 1: Create chat response schema

     Create a Zod schema for the LLM's response structure:

     // src/core/schemas/chat.ts
     const ChatResponseSchema = z.object({
       question: z.string(),           // "What's your story about?"
       chips: z.array(z.string()),     // ["A brave puppy", "A magical garden", ...]
       fieldToUpdate: z.string(),      // "storyArc"
       isComplete: z.boolean(),        // true when StoryBrief has enough info
     });

     Step 2: Create chat agent

     New agent that takes partial StoryBrief and returns next question + chips:

     // src/core/agents/chat.ts
     export const chatAgent = async (
       partial: Partial<StoryBrief>,
       history: ModelMessage[]
     ): Promise<ChatResponse> => {
       const { object } = await generateObject({
         model: anthropic('claude-sonnet-4-5-20250929'),
         schema: ChatResponseSchema,
         system: CHAT_SYSTEM_PROMPT,
         messages: history,
       });
       return object;
     };

     System prompt instructs the LLM to:
     - Analyze what fields are missing/incomplete
     - Ask one question at a time
     - Generate 3-4 contextually relevant chips
     - Set isComplete: true when ready to generate StoryBrief

     Step 3: Replace story-intake.ts

     Rewrite src/cli/prompts/story-intake.ts with the chat loop:

     export async function runStoryIntake(): Promise<StoryBrief> {
       const partial: Partial<StoryBrief> = {};
       const history: ModelMessage[] = [];

       while (true) {
         const spinner = ora('Thinking...').start();
         const response = await chatAgent(partial, history);
         spinner.stop();

         if (response.isComplete) {
           return buildFinalBrief(partial);
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

         // Update partial brief and history
         partial[response.fieldToUpdate] = finalAnswer;
         history.push(
           { role: 'assistant', content: response.question },
           { role: 'user', content: finalAnswer }
         );
       }
     }

     Step 4: Wire into CLI

     Update src/cli/commands/create.ts or add to brief command to use the new intake:

     const brief = await runStoryIntake();
     // Continue with pipeline...

     Files to Modify

     | File                            | Action                 |
     |---------------------------------|------------------------|
     | src/core/schemas/index.ts       | Add ChatResponseSchema |
     | src/core/agents/chat.ts         | Create new chat agent  |
     | src/core/agents/index.ts        | Export chat agent      |
     | src/cli/prompts/story-intake.ts | Replace with chat loop |
     | src/cli/commands/brief.ts       | Wire up new intake     |

     Key Decisions

     1. Message history: Pass full conversation history to LLM for context continuity
     2. Chip count: Generate 3-4 chips per question (not overwhelming, enough variety)
     3. Field mapping: LLM returns which field to update (flexible, LLM-driven)
     4. Completion detection: LLM decides when enough info gathered via isComplete flag
     5. Custom input: Always available as escape hatch via "Enter custom response"

     System Prompt Outline

     You are a friendly children's book story designer helping users create a StoryBrief.

     Current partial brief: {partial}

     Your job:
     1. Look at what's missing or could use more detail
     2. Ask ONE question to fill in the most important gap
     3. Generate 3-4 suggested answers ("chips") based on context so far
     4. Return the field name this answer should update

     Required fields: title, storyArc, setting, ageRange, characters (at least 1)
     Optional fields: tone, moral, interests, customInstructions

     When all required fields are filled and the story feels complete, set isComplete: true.