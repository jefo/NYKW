import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parseAdrFile } from '../core/parser.js';
import type { AdrNode, AdrLayer, AdrStatus } from '../types.js';

const SKIP_FILES = new Set(['readme.md', 'index.md']);
const ADR_ID_RE = /^ADR-(\d{4})-/;

export async function getAllAdrs(directory: string): Promise<AdrNode[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const mdFiles = entries.filter(
    (e) => e.isFile() && extname(e.name) === '.md' && !SKIP_FILES.has(e.name.toLowerCase()),
  );

  const nodes: AdrNode[] = [];
  for (const file of mdFiles) {
    const filePath = join(directory, file.name);
    const content = await readFile(filePath, 'utf-8');
    try {
      nodes.push(parseAdrFile(content, filePath));
    } catch (err) {
      console.warn(`Warning: skipping ${filePath} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return nodes;
}

export async function createAdr(
  directory: string,
  params: { title: string; layers: AdrLayer[]; summary: string },
): Promise<string> {
  await mkdir(directory, { recursive: true });

  const existingIds = await getExistingIds(directory);
  const id = nextId(existingIds);
  const slug = slugify(params.title);
  const filename = `${id}-${slug}.md`;
  const filePath = join(directory, filename);

  const layersYaml = params.layers.map((l) => `  - "${l}"`).join('\n');
  const today = new Date().toISOString().slice(0, 10);

  const content = `---
id: "${id}"
title: "${params.title.replace(/"/g, '\\"')}"
status: "draft"
summary: "${params.summary.replace(/"/g, '\\"')}"
logical_layers:
${layersYaml}
---

# Контекст

<!-- Опиши проблему, почему возникла необходимость в решении. -->

# Решение

<!-- Опиши принятое решение. -->

# Последствия

<!-- Положительные и отрицательные последствия. -->

## ADR Log

### [${today}] draft
Создано. ${params.summary}
`;

  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

async function getExistingIds(directory: string): Promise<number[]> {
  const entries = await readdir(directory).catch(() => [] as string[]);
  const ids: number[] = [];
  for (const name of entries) {
    const m = name.match(ADR_ID_RE);
    if (m) ids.push(Number.parseInt(m[1], 10));
  }
  return ids;
}

function nextId(existing: number[]): string {
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `ADR-${String(max + 1).padStart(4, '0')}`;
}

export async function initAdrDir(directory: string): Promise<string> {
  await mkdir(directory, { recursive: true });

  const configDir = join(directory, '.nykw');
  await mkdir(configDir, { recursive: true });

  const configYml = `# NYKW configuration
adrs_dir: "${directory}"
# Supported logical layers (customize for your project)
layers:
  - domain
  - application
  - infra
# Valid status transitions
transitions:
  draft: [accepted, deprecated]
  accepted: [deprecated, superseded]
  deprecated: [superseded]
`;
  await writeFile(join(configDir, 'config.yml'), configYml, 'utf-8');

  // Write INDEX.md
  const indexMd = `# Architecture Decision Records

| ID | Title | Status | Layers | Summary |
|----|-------|--------|--------|---------|
`;
  // Don't overwrite existing INDEX.md
  const indexPath = join(directory, 'INDEX.md');
  await writeFile(indexPath, indexMd, 'utf-8').catch(() => {});

  return directory;
}

export async function mutateAdr(
  directory: string,
  id: string,
  newStatus: AdrStatus,
  logDescription: string,
): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const target = entries.find(
    (e) => e.isFile() && extname(e.name) === '.md' && e.name.startsWith(`${id}-`),
  );

  if (!target) throw new Error(`ADR ${id} not found in ${directory}`);

  const filePath = join(directory, target.name);
  const content = await readFile(filePath, 'utf-8');

  // Validate the file parses correctly
  const adr = parseAdrFile(content, filePath);

  // Update status in YAML frontmatter
  const updated = content.replace(
    /^(status:\s*")[^"]*(")/m,
    `$1${newStatus}$2`,
  );

  // Append to ## ADR Log
  const today = new Date().toISOString().slice(0, 10);
  const logEntry = `\n### [${today}] ${adr.status} -> ${newStatus}\n${logDescription}\n`;

  // Append to end of ADR Log section (chronological order)
  let mutated: string;
  const logSectionStart = updated.search(/^##\s+ADR\s+Log\s*$/im);
  if (logSectionStart !== -1) {
    mutated = updated.trimEnd() + logEntry;
  } else {
    // No ADR Log section — create one
    mutated = updated.trimEnd() + `\n## ADR Log\n${logEntry}`;
  }

  await writeFile(filePath, mutated, 'utf-8');
  return filePath;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
