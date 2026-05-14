import matter from 'gray-matter';
import { adrFrontmatterSchema } from './schema.js';
import type { AdrNode, AdrLogEntry } from '../types.js';

export class AdrParseError extends Error {
  constructor(
    message: string,
    public adrId?: string,
  ) {
    super(adrId ? `[${adrId}] ${message}` : message);
    this.name = 'AdrParseError';
  }
}

const LOG_HEADING = /^##\s+ADR\s+Log\s*$/im;
const LOG_ENTRY = /^###\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+)$/im;

export function parseAdrFile(fileContent: string, filePath?: string): AdrNode {
  const gm = matter(fileContent);

  const parsed = adrFrontmatterSchema.safeParse(gm.data);

  if (!parsed.success) {
    const adrId = gm.data?.id;
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new AdrParseError(issues, adrId);
  }

  const frontmatter = parsed.data;
  const history = parseAdrLog(gm.content, frontmatter.id);

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    status: frontmatter.status,
    summary: frontmatter.summary,
    logical_layers: frontmatter.logical_layers,
    tags: frontmatter.tags,
    supersedes: frontmatter.supersedes,
    history,
    rawBody: gm.content.trim(),
  };
}

function parseAdrLog(content: string, adrId: string): AdrLogEntry[] {
  const logHeadingMatch = content.match(LOG_HEADING);
  if (!logHeadingMatch || logHeadingMatch.index === undefined) return [];

  // Текст после заголовка ## ADR Log
  const logSection = content.slice(logHeadingMatch.index + logHeadingMatch[0].length);

  const entries: AdrLogEntry[] = [];
  const lines = logSection.split('\n');

  let currentDate = '';
  let currentStatus = '';
  let currentDescription = '';

  for (const line of lines) {
    const entryMatch = line.match(LOG_ENTRY);
    if (entryMatch) {
      // Сохраняем предыдущую запись
      if (currentDate && currentStatus) {
        entries.push({
          date: currentDate,
          status: currentStatus,
          description: currentDescription.trim(),
        });
      }
      currentDate = entryMatch[1];
      currentStatus = entryMatch[2];
      currentDescription = '';
    } else if (currentDate) {
      // Продолжение описания
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        currentDescription += (currentDescription ? '\n' : '') + trimmed;
      }
    }
  }

  // Последняя запись
  if (currentDate && currentStatus) {
    entries.push({
      date: currentDate,
      status: currentStatus,
      description: currentDescription.trim(),
    });
  }

  return entries;
}
