import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getAllAdrs, createAdr, mutateAdr, initAdrDir } from '../src/storage/fs-repo.js';

let tmpDir: string;
let adrDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'nykw-test-'));
  adrDir = join(tmpDir, 'adr');
  await initAdrDir(adrDir);
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('createAdr', () => {
  it('создаёт ADR файл с правильным ID и slug', async () => {
    const path = await createAdr(adrDir, {
      title: 'Тестовое решение',
      layers: ['infra'],
      summary: 'Тестовый ADR для проверки',
    });

    expect(path).toContain('ADR-0001');
    expect(path).toContain('тестовое-решение');
    expect(path).toContain('.md');
  });

  it('инкрементирует ID', async () => {
    const path = await createAdr(adrDir, {
      title: 'Второе решение',
      layers: ['application'],
      summary: 'Второй ADR',
    });

    expect(path).toContain('ADR-0002');
  });
});

describe('getAllAdrs', () => {
  it('читает все созданные ADR', async () => {
    const nodes = await getAllAdrs(adrDir);
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id).sort()).toEqual(['ADR-0001', 'ADR-0002']);
  });
});

describe('mutateAdr', () => {
  it('меняет статус и дописывает лог', async () => {
    const path = await mutateAdr(adrDir, 'ADR-0001', 'accepted', 'Утверждено');

    expect(path).toContain('ADR-0001');

    const nodes = await getAllAdrs(adrDir);
    const adr = nodes.find((n) => n.id === 'ADR-0001')!;
    expect(adr.status).toBe('accepted');
    expect(adr.history.length).toBeGreaterThanOrEqual(2);
    const lastEntry = adr.history[adr.history.length - 1];
    expect(lastEntry.status).toContain('accepted');
  });

  it('выбрасывает если ADR не найден', async () => {
    await expect(mutateAdr(adrDir, 'ADR-0099', 'accepted', 'нет такого')).rejects.toThrow('not found');
  });
});
