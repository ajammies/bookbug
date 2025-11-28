import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile, fetchJson } from './http';

describe('http utils', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('downloadFile', () => {
    it('downloads file as buffer', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testData.buffer),
      });

      const result = await downloadFile('https://example.com/file.bin');

      expect(result).toBeInstanceOf(Buffer);
      expect([...result]).toEqual([...testData]);
      expect(fetch).toHaveBeenCalledWith('https://example.com/file.bin');
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(downloadFile('https://example.com/missing')).rejects.toThrow(
        'HTTP 404'
      );
    });
  });

  describe('fetchJson', () => {
    it('fetches and parses JSON', async () => {
      const testData = { message: 'hello', count: 10 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testData),
      });

      const result = await fetchJson<typeof testData>(
        'https://api.example.com/data'
      );

      expect(result).toEqual(testData);
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/data');
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        fetchJson('https://api.example.com/error')
      ).rejects.toThrow('HTTP 500');
    });
  });
});
