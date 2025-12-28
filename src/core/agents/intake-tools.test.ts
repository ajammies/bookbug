/**
 * Tests for intake tools
 *
 * Verifies that tools correctly update state and return appropriate feedback.
 * Focus on tool execution logic, not LLM interaction.
 */
import { describe, it, expect } from 'vitest';
import { createIntakeTools, type IntakeState } from './intake-tools';

describe('createIntakeTools', () => {
  const createState = (): IntakeState => ({
    brief: {},
    plot: {},
    isComplete: false,
  });

  describe('brief field tools', () => {
    it('setTitle updates brief.title', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.setTitle.execute({ title: 'The Magic Garden' });

      expect(result.success).toBe(true);
      expect(state.brief.title).toBe('The Magic Garden');
      expect(result.updatedFields).toContain('title');
    });

    it('setStoryArc updates brief.storyArc', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.setStoryArc.execute({ storyArc: 'A child discovers courage' });

      expect(result.success).toBe(true);
      expect(state.brief.storyArc).toBe('A child discovers courage');
    });

    it('setSetting updates brief.setting', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.setSetting.execute({ setting: 'A magical forest in spring' });

      expect(result.success).toBe(true);
      expect(state.brief.setting).toBe('A magical forest in spring');
    });

    it('setAgeRange validates min <= max', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const invalidResult = await tools.setAgeRange.execute({ min: 8, max: 5 });
      expect(invalidResult.success).toBe(false);
      expect(state.brief.ageRange).toBeUndefined();

      const validResult = await tools.setAgeRange.execute({ min: 4, max: 8 });
      expect(validResult.success).toBe(true);
      expect(state.brief.ageRange).toEqual({ min: 4, max: 8 });
    });

    it('setPageCount updates brief.pageCount', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.setPageCount.execute({ pageCount: 16 });

      expect(result.success).toBe(true);
      expect(state.brief.pageCount).toBe(16);
    });

    it('addInterest accumulates interests', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addInterest.execute({ interest: 'dinosaurs' });
      await tools.addInterest.execute({ interest: 'space' });
      await tools.addInterest.execute({ interest: 'dinosaurs' }); // duplicate

      expect(state.brief.interests).toEqual(['dinosaurs', 'space']);
    });
  });

  describe('character tools', () => {
    it('addCharacter creates new character', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.addCharacter.execute({
        name: 'Luna',
        description: 'A curious little rabbit',
        role: 'protagonist',
        traits: ['curious', 'brave'],
      });

      expect(result.success).toBe(true);
      expect(state.brief.characters).toHaveLength(1);
      expect(state.brief.characters![0]).toEqual({
        name: 'Luna',
        description: 'A curious little rabbit',
        role: 'protagonist',
        traits: ['curious', 'brave'],
        notes: [],
      });
    });

    it('addCharacter updates existing character by name (case insensitive)', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addCharacter.execute({
        name: 'Luna',
        description: 'A curious little rabbit',
      });

      await tools.addCharacter.execute({
        name: 'LUNA',
        description: 'A brave little rabbit who loves adventure',
        role: 'hero',
      });

      expect(state.brief.characters).toHaveLength(1);
      expect(state.brief.characters![0].description).toBe('A brave little rabbit who loves adventure');
      expect(state.brief.characters![0].role).toBe('hero');
    });

    it('addCharacter accumulates multiple characters (fixes issue #96)', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addCharacter.execute({
        name: 'Luna',
        description: 'A curious little rabbit',
      });

      await tools.addCharacter.execute({
        name: 'Max',
        description: 'A friendly fox',
      });

      await tools.addCharacter.execute({
        name: 'Owl',
        description: 'A wise old owl',
      });

      expect(state.brief.characters).toHaveLength(3);
      expect(state.brief.characters!.map(c => c.name)).toEqual(['Luna', 'Max', 'Owl']);
    });

    it('updateCharacter applies partial updates', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addCharacter.execute({
        name: 'Luna',
        description: 'A little rabbit',
        traits: ['shy'],
      });

      const result = await tools.updateCharacter.execute({
        name: 'Luna',
        updates: { traits: ['brave', 'curious'] },
      });

      expect(result.success).toBe(true);
      expect(state.brief.characters![0].description).toBe('A little rabbit');
      expect(state.brief.characters![0].traits).toEqual(['brave', 'curious']);
    });

    it('updateCharacter returns error for non-existent character', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.updateCharacter.execute({
        name: 'NonExistent',
        updates: { traits: ['brave'] },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('plot tools', () => {
    it('setStoryArcSummary updates plot.storyArcSummary', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.setStoryArcSummary.execute({
        storyArcSummary: 'Luna overcomes her fear of the dark',
      });

      expect(result.success).toBe(true);
      expect(state.plot.storyArcSummary).toBe('Luna overcomes her fear of the dark');
    });

    it('addPlotBeat accumulates beats', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addPlotBeat.execute({ purpose: 'setup', description: 'Luna lives in a cozy burrow' });
      await tools.addPlotBeat.execute({ purpose: 'conflict', description: 'A storm blocks the path home' });
      await tools.addPlotBeat.execute({ purpose: 'climax', description: 'Luna finds courage to cross the dark forest' });

      expect(state.plot.plotBeats).toHaveLength(3);
      expect(state.plot.plotBeats![0].purpose).toBe('setup');
      expect(state.plot.plotBeats![2].purpose).toBe('climax');
    });

    it('updatePlotBeat modifies existing beat', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      await tools.addPlotBeat.execute({ purpose: 'setup', description: 'Original description' });

      const result = await tools.updatePlotBeat.execute({
        index: 0,
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(state.plot.plotBeats![0].description).toBe('Updated description');
      expect(state.plot.plotBeats![0].purpose).toBe('setup'); // unchanged
    });

    it('updatePlotBeat returns error for invalid index', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.updatePlotBeat.execute({
        index: 5,
        description: 'Should fail',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('conversation tools', () => {
    it('promptUser returns success with question details', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      const result = await tools.promptUser.execute({
        question: 'What kind of story would you like?',
        options: ['Adventure', 'Friendship', 'Learning'],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Asked');
    });

    it('finishIntake sets isComplete flag', async () => {
      const state = createState();
      const tools = createIntakeTools(state);

      expect(state.isComplete).toBe(false);

      const result = await tools.finishIntake.execute({ summary: 'All fields collected' });

      expect(result.success).toBe(true);
      expect(state.isComplete).toBe(true);
    });
  });
});
