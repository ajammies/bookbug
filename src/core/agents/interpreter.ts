import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StoryBriefSchema, type StoryBrief } from '../schemas';

const SYSTEM_PROMPT = `You are an expert at extracting and INFERRING story details from minimal user input. Be AGGRESSIVE about filling in the StoryBrief - users want a quick experience, not 20 questions.

CORE PRINCIPLE: Fill as much as possible. Infer sensible defaults. Users will correct you if needed.

INFERENCE RULES:
- Any animal/creature mentioned → create a full character (name it if unnamed, add traits, role=protagonist)
- Child mentioned → age range 4-7, warm tone
- Adventure/quest → add a simple moral about courage/friendship
- No setting mentioned → infer from character (puppy → cozy neighborhood, dragon → magical kingdom)
- Always default: pageCount=24, ageRange={min:4,max:7}
- Generate a title if you can infer the story theme
- Infer tone from content (animals=warm, adventure=exciting, bedtime=gentle)

EXTRACTION RULES:
1. Parse EVERYTHING the user says - names, places, themes, adjectives
2. Convert vague descriptions into concrete schema fields
3. "A story about friendship" → storyArc="Two friends learn the value of their bond", moral="True friends stick together"
4. "My kid loves dinosaurs" → interests=["dinosaurs"], character with dinosaur, setting=prehistoric or dino-themed

StoryBrief fields to fill:
- title: Infer a catchy title from the theme
- storyArc: The main plot/journey (be specific, not vague)
- setting: Where it happens (be descriptive)
- ageRange: {min, max} - default 4-7
- pageCount: default 24
- characters: Array with name, description, role, traits, notes
- tone: warm/exciting/gentle/playful/etc
- moral: A simple lesson (always infer one if story-related)
- interests: Child's interests mentioned
- customInstructions: Specific requests

BE BOLD. Fill everything you reasonably can. The user will tell you if something is wrong.`;

/**
 * InterpreterAgent: Extracts StoryBrief fields from any user input
 * Returns a partial brief that can be merged with existing data
 */
export const interpreterAgent = async (
  userMessage: string,
  currentBrief: Partial<StoryBrief>
): Promise<Partial<StoryBrief>> => {
  const contextualPrompt = currentBrief && Object.keys(currentBrief).length > 0
    ? `Current brief context:\n${JSON.stringify(currentBrief, null, 2)}\n\nUser message:\n${userMessage}`
    : userMessage;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StoryBriefSchema.partial(),
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return { ...currentBrief, ...object };
};
