import { describe, it, expect } from 'vitest';
import { parseAdrFile, AdrParseError } from '../src/core/parser.js';

const validAdr = `---
id: "ADR-001"
title: "Используем Redis"
status: "accepted"
summary: "Добавили Redis для кеширования (ttl 15m)."
logical_layers:
  - "infra"
  - "application"
tags: ["cache"]
---

# Контекст
Тут много текста, который парсеру истории не интересен.

## ADR Log

### [2024-05-20] draft
Идея возникла в обсуждении.

### [2024-05-22] accepted
Утверждено на синке.
`;

const adrWithoutLog = `---
id: "ADR-002"
title: "Без истории"
status: "draft"
summary: "Тестовый ADR без лога."
logical_layers:
  - "domain"
---

# Контекст
Никакой истории тут нет.
`;

const adrMissingSummary = `---
id: "ADR-003"
title: "Без summary"
status: "accepted"
logical_layers:
  - "infra"
---

# Контекст
Забыли summary.
`;

describe('parseAdrFile', () => {
  it('успешно парсит валидный ADR со всеми полями', () => {
    const result = parseAdrFile(validAdr);

    expect(result.id).toBe('ADR-001');
    expect(result.title).toBe('Используем Redis');
    expect(result.status).toBe('accepted');
    expect(result.summary).toBe('Добавили Redis для кеширования (ttl 15m).');
    expect(result.logical_layers).toEqual(['infra', 'application']);
    expect(result.tags).toEqual(['cache']);
    expect(result.supersedes).toBeUndefined();
  });

  it('парсит историю из ## ADR Log', () => {
    const result = parseAdrFile(validAdr);

    expect(result.history).toHaveLength(2);

    expect(result.history[0]).toEqual({
      date: '2024-05-20',
      status: 'draft',
      description: 'Идея возникла в обсуждении.',
    });

    expect(result.history[1]).toEqual({
      date: '2024-05-22',
      status: 'accepted',
      description: 'Утверждено на синке.',
    });
  });

  it('сохраняет rawBody (тело без frontmatter)', () => {
    const result = parseAdrFile(validAdr);

    expect(result.rawBody).toContain('# Контекст');
    expect(result.rawBody).toContain('## ADR Log');
    expect(result.rawBody).not.toContain('summary:');
  });

  it('возвращает пустой history если секция ## ADR Log отсутствует', () => {
    const result = parseAdrFile(adrWithoutLog);

    expect(result.history).toEqual([]);
    expect(result.id).toBe('ADR-002');
  });

  it('выбрасывает AdrParseError если отсутствует summary', () => {
    expect(() => parseAdrFile(adrMissingSummary)).toThrow(AdrParseError);
    try {
      parseAdrFile(adrMissingSummary);
    } catch (e) {
      expect(e).toBeInstanceOf(AdrParseError);
      expect((e as AdrParseError).message).toContain('summary');
      expect((e as AdrParseError).message).toContain('ADR-003');
    }
  });

  it('выбрасывает AdrParseError если статус невалидный', () => {
    const badStatus = `---
id: "ADR-004"
title: "Плохой статус"
status: "unknown"
summary: "Тест"
logical_layers:
  - "domain"
---
`;
    expect(() => parseAdrFile(badStatus)).toThrow(AdrParseError);
  });
});
