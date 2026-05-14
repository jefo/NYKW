#!/usr/bin/env node

import { Command } from 'commander';
import { getAllAdrs, createAdr, initAdrDir, mutateAdr } from './storage/fs-repo.js';
import { filterAdrs, formatShort, formatJson, formatFull } from './core/query.js';
import type { AdrLayer, AdrStatus } from './types.js';

const VALID_LAYERS = new Set<string>(['domain', 'application', 'infra']);
const VALID_FORMATS = new Set<string>(['short', 'json', 'full']);

const program = new Command();

program
  .name('nykw')
  .description('Now You Know Why — semantic ADR graph CLI')
  .version('0.1.0');

program
  .command('query')
  .description('Query ADR graph for LLM context')
  .option('--dir <path>', 'ADRs directory', './docs/adr')
  .option('--layer <name>', 'Filter by layer (domain|application|infra)')
  .option('--status <status>', 'Filter by status (draft|accepted|deprecated|superseded)')
  .option('--format <fmt>', 'Output format (short|json|full)', 'short')
  .action(async (opts) => {
    const dir: string = opts.dir;
    const format: string = opts.format;

    if (!VALID_FORMATS.has(format)) {
      console.error(`Unknown format: ${format}. Use: short, json, full`);
      process.exit(1);
    }

    if (opts.layer && !VALID_LAYERS.has(opts.layer)) {
      console.error(`Unknown layer: ${opts.layer}. Use: domain, application, infra`);
      process.exit(1);
    }

    const nodes = await getAllAdrs(dir);
    const filtered = filterAdrs(nodes, {
      status: opts.status as AdrStatus | undefined,
      layer: opts.layer as AdrLayer | undefined,
    });

    switch (format) {
      case 'short':
        console.log(formatShort(filtered));
        break;
      case 'json':
        console.log(formatJson(filtered));
        break;
      case 'full':
        console.log(formatFull(filtered));
        break;
    }
  });

program
  .command('make')
  .description('Create a new ADR')
  .argument('<title>', 'Title of the ADR')
  .option('--layers <names>', 'Comma-separated layers (domain,application,infra)', 'domain')
  .option('--summary <text>', 'Short summary for LLM context')
  .option('--dir <path>', 'ADRs directory', './docs/adr')
  .action(async (title: string, opts) => {
    const layers: string[] = opts.layers.split(',').map((s: string) => s.trim());
    const invalid = layers.filter((l) => !VALID_LAYERS.has(l));
    if (invalid.length > 0) {
      console.error(`Unknown layer(s): ${invalid.join(', ')}. Use: domain, application, infra`);
      process.exit(1);
    }

    const summary = opts.summary || title;

    try {
      const filePath = await createAdr(opts.dir, {
        title,
        layers: layers as AdrLayer[],
        summary,
      });
      console.log(`Created: ${filePath}`);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize ADR directory')
  .option('--path <path>', 'ADRs directory', './docs/adr')
  .action(async (opts) => {
    const dir = await initAdrDir(opts.path);
    console.log(`Initialized NYKW ADR directory: ${dir}`);
    console.log(`Config: ${dir}/.nykw/config.yml`);
  });

program
  .command('mutate')
  .description('Change ADR status and log the transition')
  .argument('<id>', 'ADR ID (e.g. ADR-0001)')
  .requiredOption('--status <status>', 'New status (draft|accepted|deprecated|superseded)')
  .requiredOption('--log <text>', 'Description of the transition')
  .option('--dir <path>', 'ADRs directory', './docs/adr')
  .action(async (id: string, opts) => {
    const statuses = ['draft', 'accepted', 'deprecated', 'superseded'];
    if (!statuses.includes(opts.status)) {
      console.error(`Unknown status: ${opts.status}. Use: ${statuses.join(', ')}`);
      process.exit(1);
    }

    try {
      const filePath = await mutateAdr(opts.dir, id, opts.status as AdrStatus, opts.log);
      console.log(`Updated: ${filePath} -> ${opts.status}`);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
