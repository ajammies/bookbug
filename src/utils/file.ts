import fs from 'fs/promises';

export const loadJson = async <T>(path: string): Promise<T> => {
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content) as T;
};

export const saveJson = async (path: string, data: unknown): Promise<void> => {
  await fs.writeFile(path, JSON.stringify(data, null, 2));
};
