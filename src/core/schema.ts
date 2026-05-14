import { z } from 'zod';

const adrStatuses = ['draft', 'accepted', 'deprecated', 'superseded'] as const;
const adrLayers = ['domain', 'application', 'infra'] as const;

export const adrFrontmatterSchema = z.object({
  id: z.string().min(1, "id обязателен"),
  title: z.string().min(1, "title обязателен"),
  status: z.enum(adrStatuses),
  summary: z.string().min(1, "summary критично для LLM — поле не может быть пустым"),
  logical_layers: z.array(z.enum(adrLayers)).min(1, "нужен хотя бы один logical_layer"),
  tags: z.array(z.string()).optional(),
  supersedes: z.array(z.string()).optional(),
});

export type AdrFrontmatterParsed = z.infer<typeof adrFrontmatterSchema>;
