import { describe, it, expect } from 'vitest';
import { filterAdrs, formatShort, formatJson } from '../src/core/query.js';
import type { AdrNode } from '../src/types.js';

const makeNode = (overrides: Partial<AdrNode> = {}): AdrNode => ({
  id: 'ADR-0001',
  title: 'Test',
  status: 'accepted',
  summary: 'Тестовый ADR',
  logical_layers: ['infra'],
  history: [],
  rawBody: '',
  ...overrides,
});

const nodes: AdrNode[] = [
  makeNode({ id: 'ADR-0001', status: 'accepted', logical_layers: ['infra', 'application'], summary: 'Redis кэш' }),
  makeNode({ id: 'ADR-0002', status: 'draft', logical_layers: ['domain'], summary: 'Новая модель' }),
  makeNode({ id: 'ADR-0003', status: 'accepted', logical_layers: ['infra'], summary: 'PostgreSQL выбор' }),
  makeNode({ id: 'ADR-0004', status: 'deprecated', logical_layers: ['application'], summary: 'Старый API' }),
];

describe('filterAdrs', () => {
  it('возвращает все если фильтры пустые', () => {
    expect(filterAdrs(nodes, {})).toHaveLength(4);
  });

  it('фильтрует по одному статусу', () => {
    const result = filterAdrs(nodes, { status: 'accepted' });
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(['ADR-0001', 'ADR-0003']);
  });

  it('фильтрует по массиву статусов', () => {
    const result = filterAdrs(nodes, { status: ['accepted', 'deprecated'] });
    expect(result).toHaveLength(3);
  });

  it('фильтрует по слою', () => {
    const result = filterAdrs(nodes, { layer: 'infra' });
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(['ADR-0001', 'ADR-0003']);
  });

  it('фильтрует по статусу и слою одновременно', () => {
    const result = filterAdrs(nodes, { status: 'accepted', layer: 'infra' });
    expect(result).toHaveLength(2);
  });

  it('возвращает пустой массив если ничего не подходит', () => {
    const result = filterAdrs(nodes, { status: 'superseded' });
    expect(result).toEqual([]);
  });
});

describe('formatShort', () => {
  it('форматирует ADR в плоский список', () => {
    const two = [nodes[0], nodes[2]];
    const out = formatShort(two);
    expect(out).toContain('ADR-0001: Redis кэш [infra, application]');
    expect(out).toContain('ADR-0003: PostgreSQL выбор [infra]');
  });

  it('возвращает пустую строку для пустого массива', () => {
    expect(formatShort([])).toBe('');
  });
});

describe('formatJson', () => {
  it('валидный JSON', () => {
    const json = formatJson([nodes[0]]);
    const parsed = JSON.parse(json);
    expect(parsed[0].id).toBe('ADR-0001');
  });
});
