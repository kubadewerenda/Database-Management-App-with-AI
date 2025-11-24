import { z } from 'zod'

export const projectIdSchema = z
    .string()
    .regex(/^\d+$/, 'Project id must be a positive integer')
    .transform((v) => Number(v))

export const projectCreateSchema = z
    .object({
        name: z.string().trim().min(1, 'Name is required').max(255),
        description: z.string().trim().max(2000).optional(),
        color: z
            .string()
            .trim()
            .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 'Invalid hex color')
            .optional()
    })

export const projectUpdateSchema = projectCreateSchema.partial()

export const projectListPaginationSchema = z
    .object({
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        search: z.string().trim().min(1).optional(),
        order: z
            .enum(['asc', 'desc', 'ASC', 'DESC'])
            .optional()
            .transform(v => (v ? v.toUpperCase() as 'ASC' | 'DESC' : 'DESC')),
    })