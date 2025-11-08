// AuthorAgent is the novelist node. It receives the story brief and
// produces a structured draft the rest of the organization can trust.
import { StoryDraft, StoryDraftSchema, StoryBrief } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { run, type AgentProvider } from './providers/agentProvider.js';
import { ClaudeAgentProvider } from './providers/claudeAgentProvider.js';

export class AuthorAgent {
  // This agent sits between brief capture and illustration planning. Everyone
  // downstream relies on its JSON output, so we validate aggressively.
  private readonly agent: AgentProvider<StoryDraft>;
  private readonly log: typeof defaultLogger;

  constructor(log: typeof defaultLogger = defaultLogger) {
    this.log = log;
    this.agent = this.createAdapter();
  }

  async draft(brief: StoryBrief): Promise<StoryDraft> {
    const prompt = AuthorAgent.buildPrompt(brief);
    const result = await run(this.agent, prompt);
    const parsed = result.finalOutput as StoryDraft;
    this.log.info({ title: parsed.title, pages: parsed.pages.length }, 'Author agent produced draft');
    return parsed;
  }

  private createAdapter(): AgentProvider<StoryDraft> {
    return new ClaudeAgentProvider<StoryDraft>({
      name: 'BookBug Author',
      instructions: AuthorAgent.buildSystemInstructions(),
      model: AuthorAgent.CLAUDE_MODEL,
      outputType: StoryDraftSchema,
      maxOutputTokens: 4096,
    });
  }

  private static buildSystemInstructions(): string {
    return `You are the BookBug Author. Follow the quality checklist, honor any plot requirements, and respond with JSON only.

Quality checklist:
${AuthorAgent.STORY_QUALITY_GUIDELINES}

Return objects that satisfy this schema:
${JSON.stringify(StoryDraftSchema.shape, null, 2)}`;
  }

  private static buildPrompt(brief: StoryBrief): string {
    const briefJson = JSON.stringify(brief, null, 2);
    const plotGuidance = AuthorAgent.buildPlotGuidance(brief.plotBeats, brief.allowCreativeLiberty);
    return `Story brief:
${briefJson}

${plotGuidance}TASK:
- Produce ${brief.pageCount} pages with "pageNumber", "summary", "text", and "imagePrompt".
- Keep tone age-appropriate and consistent with theme, moral, and characters.`;
  }

  private static buildPlotGuidance(plotPoints: string[] | undefined, allowCreativeLiberty: boolean | undefined): string {
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

  private static readonly CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

  private static readonly STORY_QUALITY_GUIDELINES = `Children's Story Quality Checklist

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
}
