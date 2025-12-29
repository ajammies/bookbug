/**
 * Tests for draft tools auto-generated from schema
 */
import { describe, it, expect } from 'vitest';
import { createDraftTools, type DraftState } from './draft-tools';

describe('createDraftTools', () => {
  const createState = (): DraftState => ({
    draft: {},
    isComplete: false,
  });

  describe('auto-generated setter tools', () => {
    it('setTitle updates draft.title', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.setTitle.execute({ value: 'The Magic Garden' });

      expect(result.success).toBe(true);
      expect(state.draft.title).toBe('The Magic Garden');
    });

    it('setStoryArc updates draft.storyArc', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.setStoryArc.execute({ value: 'A child discovers courage' });

      expect(result.success).toBe(true);
      expect(state.draft.storyArc).toBe('A child discovers courage');
    });

    it('setSetting updates draft.setting', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.setSetting.execute({ value: 'A magical forest in spring' });

      expect(result.success).toBe(true);
      expect(state.draft.setting).toBe('A magical forest in spring');
    });

    it('setPageCount updates draft.pageCount', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.setPageCount.execute({ value: 16 });

      expect(result.success).toBe(true);
      expect(state.draft.pageCount).toBe(16);
    });
  });

  describe('auto-generated adder tools', () => {
    it('addCharacter creates new character', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.addCharacter.execute({
        name: 'Luna',
        description: 'A curious little rabbit',
        role: 'protagonist',
        traits: ['curious', 'brave'],
      });

      expect(result.success).toBe(true);
      expect(state.draft.characters).toHaveLength(1);
      expect(state.draft.characters?.[0]?.name).toBe('Luna');
    });

    it('addCharacter accumulates multiple characters', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addCharacter.execute({ name: 'Luna', description: 'A rabbit' });
      await tools.addCharacter.execute({ name: 'Max', description: 'A fox' });
      await tools.addCharacter.execute({ name: 'Owl', description: 'A wise owl' });

      expect(state.draft.characters).toHaveLength(3);
      expect(state.draft.characters?.map(c => c.name)).toEqual(['Luna', 'Max', 'Owl']);
    });

    it('addPlotBeat accumulates beats', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addPlotBeat.execute({ purpose: 'setup', description: 'Luna lives peacefully' });
      await tools.addPlotBeat.execute({ purpose: 'conflict', description: 'A storm approaches' });
      await tools.addPlotBeat.execute({ purpose: 'climax', description: 'Luna finds courage' });

      expect(state.draft.plotBeats).toHaveLength(3);
      expect(state.draft.plotBeats?.[0]?.purpose).toBe('setup');
      expect(state.draft.plotBeats?.[2]?.purpose).toBe('climax');
    });

    it('addInterest accumulates interests', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addInterest.execute({ value: 'dinosaurs' });
      await tools.addInterest.execute({ value: 'space' });

      expect(state.draft.interests).toEqual(['dinosaurs', 'space']);
    });
  });

  describe('updateCharacter tool', () => {
    it('updates existing character by name', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addCharacter.execute({ name: 'Luna', description: 'A little rabbit' });

      const result = await tools.updateCharacter.execute({
        name: 'Luna',
        updates: { description: 'A brave little rabbit', traits: ['brave', 'curious'] },
      });

      expect(result.success).toBe(true);
      expect(state.draft.characters?.[0]?.description).toBe('A brave little rabbit');
      expect(state.draft.characters?.[0]?.traits).toEqual(['brave', 'curious']);
    });

    it('matches name case-insensitively', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addCharacter.execute({ name: 'Luna', description: 'A rabbit' });

      const result = await tools.updateCharacter.execute({
        name: 'LUNA',
        updates: { role: 'hero' },
      });

      expect(result.success).toBe(true);
      expect(state.draft.characters?.[0]?.role).toBe('hero');
    });

    it('returns error for non-existent character', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      const result = await tools.updateCharacter.execute({
        name: 'NonExistent',
        updates: { traits: ['brave'] },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('updatePlotBeat tool', () => {
    it('updates existing beat by index', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addPlotBeat.execute({ purpose: 'setup', description: 'Original' });

      const result = await tools.updatePlotBeat.execute({
        index: 0,
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(state.draft.plotBeats?.[0]?.description).toBe('Updated description');
      expect(state.draft.plotBeats?.[0]?.purpose).toBe('setup'); // unchanged
    });

    it('can update purpose', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      await tools.addPlotBeat.execute({ purpose: 'setup', description: 'Test' });

      const result = await tools.updatePlotBeat.execute({
        index: 0,
        purpose: 'conflict',
      });

      expect(result.success).toBe(true);
      expect(state.draft.plotBeats?.[0]?.purpose).toBe('conflict');
    });

    it('returns error for invalid index', async () => {
      const state = createState();
      const tools = createDraftTools(state);

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
      const tools = createDraftTools(state);

      const result = await tools.promptUser.execute({
        question: 'What kind of story would you like?',
        options: ['Adventure', 'Friendship', 'Learning'],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Asked');
    });

    it('finishIntake sets isComplete flag', async () => {
      const state = createState();
      const tools = createDraftTools(state);

      expect(state.isComplete).toBe(false);

      const result = await tools.finishIntake.execute({ summary: 'All fields collected' });

      expect(result.success).toBe(true);
      expect(state.isComplete).toBe(true);
    });
  });

  describe('tool generation', () => {
    it('generates expected tools from schema', () => {
      const state = createState();
      const tools = createDraftTools(state);

      // Setters for scalar fields
      expect(tools.setTitle).toBeDefined();
      expect(tools.setStoryArc).toBeDefined();
      expect(tools.setSetting).toBeDefined();
      expect(tools.setPageCount).toBeDefined();
      expect(tools.setAgeRange).toBeDefined();
      expect(tools.setStylePreset).toBeDefined();
      expect(tools.setTone).toBeDefined();
      expect(tools.setMoral).toBeDefined();
      expect(tools.setCustomInstructions).toBeDefined();
      expect(tools.setAllowCreativeLiberty).toBeDefined();

      // Adders for array fields
      expect(tools.addCharacter).toBeDefined();
      expect(tools.addPlotBeat).toBeDefined();
      expect(tools.addInterest).toBeDefined();

      // Conversation tools
      expect(tools.promptUser).toBeDefined();
      expect(tools.finishIntake).toBeDefined();

      // Specialized tools
      expect(tools.updateCharacter).toBeDefined();
      expect(tools.updatePlotBeat).toBeDefined();
    });
  });
});
