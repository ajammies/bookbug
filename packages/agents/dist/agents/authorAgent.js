// AuthorAgent is the novelist node. It receives the intake dossier and
// produces a structured draft the rest of the organization can trust.
import { Agent, run } from '@openai/agents';
import { StoryDraftSchema } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { AgentConfig } from './agentConfig.js';
export class AuthorAgent {
    // This agent sits between intake and illustration planning. Everyone
    // downstream relies on its JSON output, so we validate aggressively.
    agent;
    log;
    constructor({ model = AgentConfig.model('author'), log = defaultLogger } = {}) {
        this.log = log;
        this.agent = new Agent({
            name: 'BookBug Author',
            instructions: ({ context }) => {
                if (!context?.intake) {
                    throw new Error('Author agent requires an intake context');
                }
                return buildAuthorInstructions(context.intake);
            },
            model,
            outputType: StoryDraftSchema,
        });
    }
    async draft(intake) {
        const result = await run(this.agent, '', { context: { intake } });
        const parsed = result.finalOutput;
        if (!parsed) {
            throw new Error('Author agent did not return a structured story draft');
        }
        this.log.info({ title: parsed.title, pages: parsed.pages.length }, 'Author agent produced draft');
        return parsed;
    }
}
const STORY_QUALITY_GUIDELINES = `Children's Story Quality Checklist

1. EMOTIONAL RESONANCE
- Use conflicts children actually face: sharing, jealousy, new experiences, frustration with rules
- Show mixed emotions (excited but scared)
- Make reactions believable for age level
- Don't: Use adult concerns, fake-happy responses, or emotions only

2. STRUCTURE
- Beginning: Introduce character + world (2-3 sentences)
- Middle: One clear problem that escalates
- End: Character-driven resolution + emotional closure
- Each sentence advances plot
- Don't: Start with exposition, multiple problems, rushed endings, tangents

3. CHARACTER GROWTH
- Show specific traits through actions
- Character makes mistakes → experiences consequences → learns gradually
- Display emotional range throughout
- Don't: Perfect characters, instant transformations, characters as moral vehicles

4. MORAL TEACHING
- Embed lessons in actions/consequences, never state explicitly
- One lesson per story
- Let story teach; characters don't lecture
- Don't: "And that's why you should..." endings, unrealistic happy resolutions

5. AGE GUIDELINES
- Ages 2-4: 50-100 words | 3-8 words/sentence | Simple conflicts (lost toy, scared) | Concrete words, repetition
- Ages 4-6: 200-400 words | 5-10 words/sentence | Social situations, simple problem-solving | Mix simple + new words
- Ages 6-8: 400-800 words | 8-15 words/sentence | Internal conflicts, empathy, multi-step problems | Descriptive vocabulary

6. LANGUAGE
- Use sensory details (what they see/hear/feel)
- Specific verbs ("tiptoed" not "walked quietly")
- Vary sentence length for rhythm
- Show don't tell ("hands shaking" not "was nervous")
- Don't: Abstract language, clichés, monotonous rhythm, purple prose

7. AUTHENTIC VOICE
- Write from child's perspective/worldview
- Natural child dialogue: "That's not fair!" "I want a turn!"
- Use child logic (immediate, concrete, self-focused)
- Don't: Adult idioms, wise philosophical children, preachy tone

8. CONFLICT RESOLUTION
- Age-appropriate conflicts children recognize
- Show attempts including failures before success
- Resolution through character action, not luck/magic
- Model healthy coping (asking for help, compromise, expressing feelings)
- Don't: Magic fixes, adults solving everything, unresolved endings

QUICK VERIFY:
✓ Authentic childhood experience for age
✓ Clear beginning-middle-end
✓ Character shows growth
✓ Moral emerges naturally (never stated)
✓ Vocabulary/complexity matches age
✓ Sensory language creates imagery
✓ Child-authentic voice
✓ Character-driven resolution with emotional closure

Final test: Would a parent enjoy rereading this? Does it feel emotionally honest? Could a child see themselves in it?`;
function buildAuthorInstructions(intake) {
    const intakeJson = JSON.stringify(intake, null, 2);
    const schemaDescription = JSON.stringify(StoryDraftSchema.shape, null, 2);
    const plotGuidance = buildPlotGuidance(intake.plotBeats, intake.allowCreativeLiberty);
    return `Generate a high-quality children's storybook with exactly the requested number of pages based on these input parameters:

${intakeJson}

${plotGuidance}QUALITY GUIDELINES:
${STORY_QUALITY_GUIDELINES}

TECHNICAL REQUIREMENTS:
- Produce the requested page count; each page requires text and imagePrompt fields.
- Image prompts should be detailed visual descriptions (setting, characters, actions, mood).
- Page numbers must be sequential starting from 1.

Return ONLY valid JSON matching this output schema:

${schemaDescription}

Do not include any other text, explanation, or markdown formatting.`;
}
function buildPlotGuidance(plotPoints, allowCreativeLiberty) {
    if (!plotPoints || plotPoints.length === 0) {
        return '';
    }
    const list = plotPoints.map((p, i) => `${i + 1}. ${p}`).join('\n');
    if (allowCreativeLiberty) {
        return `PLOT GUIDANCE (Creative Freedom):
The user mentioned these plot points:
${list}

You may use these as inspiration but have full creative freedom to:
- Modify or enhance these plot points to improve story quality
- Add additional plot elements that serve the moral and theme
- Reinterpret character roles to create better emotional resonance
- Change sequence or implementation if it strengthens the narrative

Prioritize story quality over strict adherence to these points.

`;
    }
    return `PLOT REQUIREMENTS (Follow Faithfully):
The user specified these plot points that MUST be included:
${list}

CRITICAL: You must incorporate these plot points as described.
- Include all specified events in the story
- Maintain the spirit and intent of each plot point
- You may add transitions and details between plot points
- You may enhance descriptions and dialogue
- Do NOT contradict or omit these plot points

Balance quality guidelines with faithful adherence to the specified plot.

`;
}
//# sourceMappingURL=authorAgent.js.map