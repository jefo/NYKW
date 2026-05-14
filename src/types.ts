export type AdrStatus = 'draft' | 'accepted' | 'deprecated' | 'superseded';

export type AdrLayer = 'domain' | 'application' | 'infra';

export interface AdrLogEntry {
  date: string; // YYYY-MM-DD
  status: string; // произвольный текст статуса (напр. 'evolution -> refactoring')
  description: string;
}

export interface AdrNode {
  // --- Frontmatter ---
  id: string;
  title: string;
  status: AdrStatus;
  summary: string;
  logical_layers: AdrLayer[];
  tags?: string[];
  supersedes?: string[];

  // --- Parsed Body ---
  history: AdrLogEntry[];
  rawBody: string;
}
