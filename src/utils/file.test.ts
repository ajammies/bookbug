import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadJson, saveJson } from './file';

describe('file utils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadJson', () => {
    it('loads and parses a JSON file', async () => {
      const testData = { name: 'test', count: 42 };
      const filePath = path.join(tempDir, 'test.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await loadJson<typeof testData>(filePath);

      expect(result).toEqual(testData);
    });

    it('throws on file not found', async () => {
      const filePath = path.join(tempDir, 'nonexistent.json');

      await expect(loadJson(filePath)).rejects.toThrow();
    });

    it('throws on invalid JSON', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, 'not valid json {');

      await expect(loadJson(filePath)).rejects.toThrow();
    });
  });

  describe('saveJson', () => {
    it('saves data as formatted JSON', async () => {
      const testData = { name: 'test', items: [1, 2, 3] };
      const filePath = path.join(tempDir, 'output.json');

      await saveJson(filePath, testData);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(JSON.stringify(testData, null, 2));
    });

    it('overwrites existing file', async () => {
      const filePath = path.join(tempDir, 'overwrite.json');
      await fs.writeFile(filePath, '{"old": true}');

      await saveJson(filePath, { new: true });

      const result = await loadJson<{ new: boolean }>(filePath);
      expect(result).toEqual({ new: true });
    });
  });
});
