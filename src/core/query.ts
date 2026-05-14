import type { AdrNode, AdrStatus, AdrLayer } from '../types.js';

export interface QueryFilters {
  status?: AdrStatus | AdrStatus[];
  layer?: AdrLayer;
}

export function filterAdrs(nodes: AdrNode[], filters: QueryFilters): AdrNode[] {
  let result = nodes;

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    result = result.filter((n) => statuses.includes(n.status));
  }

  if (filters.layer) {
    const layer = filters.layer;
    result = result.filter((n) => (n.logical_layers as string[]).includes(layer));
  }

  return result;
}

export function formatShort(nodes: AdrNode[]): string {
  return nodes
    .map((n) => `${n.id}: ${n.summary} [${n.logical_layers.join(', ')}]`)
    .join('\n');
}

export function formatJson(nodes: AdrNode[]): string {
  return JSON.stringify(nodes, null, 2);
}

export function formatFull(nodes: AdrNode[]): string {
  return nodes.map((n) => `## ${n.id}: ${n.title}\n\n${n.rawBody}`).join('\n\n---\n\n');
}
