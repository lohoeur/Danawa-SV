
import { z } from 'zod';
import { insertCarSalesSchema, carSales } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  stats: {
    list: {
      method: 'GET' as const,
      path: '/api/stats',
      input: z.object({
        year: z.coerce.number().optional(),
        month: z.coerce.number().optional(),
        nation: z.enum(['domestic', 'export']).optional(),
        minSales: z.coerce.number().optional(),
        includeNew: z.coerce.boolean().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof carSales.$inferSelect>()),
      },
    },
    months: {
      method: 'GET' as const,
      path: '/api/stats/months',
      responses: {
        200: z.array(z.object({ year: z.number(), month: z.number() })),
      },
    }
  },
  etl: {
    trigger: {
      method: 'POST' as const,
      path: '/api/etl/trigger',
      responses: {
        200: z.object({ message: z.string(), success: z.boolean() }),
        500: errorSchemas.internal,
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/etl/status',
      responses: {
        200: z.object({
          lastRun: z.string().nullable(),
          status: z.enum(['idle', 'running', 'failed', 'success']),
          message: z.string().optional()
        }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
