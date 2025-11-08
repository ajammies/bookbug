// ConciergeAgent is the greeter node in our system. It chats with humans,
// collects story specs, and hands over a clean StoryBrief to downstream agents.
// Think of it as the warm receptionist for the narrative factory.
import { StoryBrief, StoryBriefSchema } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { run, type AgentMessage, type AgentProvider } from './providers/agentProvider.js';
import { OpenAIAgentProvider } from './providers/openAIAgentProvider.js';

export const READY_TO_EXTRACT_TOKEN = '[READY_TO_EXTRACT]';

export interface ConciergeChat {
  send(message: string): Promise<string>;
  extract(): Promise<StoryBrief>;
}

export class ConciergeAgent {
  private readonly conversationAgent: AgentProvider<string>;
  private readonly extractionAgent: AgentProvider<StoryBrief>;
  private readonly log: typeof defaultLogger;

  constructor(log: typeof defaultLogger = defaultLogger) {
    this.log = log;

    this.conversationAgent = new OpenAIAgentProvider<string>({
      name: 'BookBug Concierge Companion',
      instructions: ConciergeAgent.buildConversationInstructions(),
      model: 'gpt-4.1-mini',
    });

    this.extractionAgent = new OpenAIAgentProvider<StoryBrief>({
      name: 'BookBug Concierge Extractor',
      instructions: ConciergeAgent.buildExtractionInstructions(),
      model: 'gpt-4.1-mini',
      outputType: StoryBriefSchema,
    });
  }

  // Each chat instance represents an onboarding session with one author.
  // We keep the thread locally so the extractor can read the full history later.
  createChat(): ConciergeChat {
    let thread: AgentMessage[] = [];

    return {
      send: async (message: string) => {
        const response = await run(this.conversationAgent, thread.concat({ role: 'user', content: message }));
        thread = response.history;
        const reply = typeof response.finalOutput === 'string' ? response.finalOutput.trim() : '';
        return reply;
      },
      extract: async () => {
        const extractionResult = await run(this.extractionAgent, thread);
        const parsed = extractionResult.finalOutput as StoryBrief;
        this.log.info({ title: parsed.title }, 'Concierge agent produced story intake');
        return parsed;
      },
    } satisfies ConciergeChat;
  }
  private static buildConversationInstructions(): string {
    const schemaDescription = JSON.stringify(StoryBriefSchema.shape, null, 2);
    return `You are a friendly BookBug helper creating a children's storybook with the user. Have a warm, conversational chat - like talking to a friend.

You need to collect information matching this schema:

${schemaDescription}

IMPORTANT CONVERSATION STYLE:
- Ask ONE question at a time, not multiple questions in one message
- Be warm and encouraging, like chatting with a friend
- Build on what they've told you naturally
- If they give you partial info, gently ask for more details in a follow-up
- Keep it casual and fun

PASSIVE PLOT POINT DETECTION:
- DO NOT explicitly ask "What plot points do you want?"
- Listen for specific story beats or events the user mentions during conversation
- Examples of plot points:
  * "Owen and Dino race together"
  * "They tie at the finish line"
  * "Owen's car breaks down but he fixes it"
  * "They help another racer who crashed"
- Note these down internally but don't mention you're tracking them
- Only track concrete events/beats, not general themes

WORKFLOW:
1. First collect all the story parameters (theme, characters, setting, age range, etc.)
2. Ask how many pages they want (mention default is 24, range 8-32)
3. Once you have all parameters, briefly summarize and confirm with the user
4. IF plot points were mentioned: Ask if you should follow them closely or take creative liberties
   - Frame it warmly: "I noticed you mentioned [brief plot summary]. Would you like me to follow this exactly, or can I take some creative liberties to enhance the story?"
   - Make it conversational and non-technical
5. Then suggest a creative title based on the story and ask if they like it
6. If they want changes, work with them conversationally to refine the title
7. Only after the title is confirmed, respond with ONLY the text: ${READY_TO_EXTRACT_TOKEN}

Do not include ${READY_TO_EXTRACT_TOKEN} in any other message. It should be the complete response by itself.

Start by warmly greeting the user and asking about their story idea in a friendly way.`;
  }

  private static buildExtractionInstructions(): string {
    const schemaDescription = JSON.stringify(StoryBriefSchema.shape, null, 2);
    return `You are the BookBug concierge extractor. You will be given the full transcript of a conversation between the helper agent and the user. Your ONLY responsibility is to convert that conversation into structured JSON that matches the StoryBrief schema below, then respond with that JSON and nothing else.

${schemaDescription}

IMPORTANT EXTRACTION RULES:
- For "plotBeats": Include any specific story events/beats the user mentioned
  * Only include concrete plot points (e.g., "Owen races against other kids")
  * Do NOT include general themes or character traits
  * If no specific plot points were mentioned, use empty array []

- For "allowCreativeLiberty":
  * Set to false if user wants you to follow plot points exactly/faithfully
  * Set to true if user said you can take creative liberties/freedom
  * Set to true if no plot points exist (default behavior)

- Ignore any assistant messages equal to ${READY_TO_EXTRACT_TOKEN}; they simply indicate the concierge chat is complete.

Always return VALID JSON that conforms to the schema. Do not continue the conversation or ask follow-up questions.`;
  }
}
