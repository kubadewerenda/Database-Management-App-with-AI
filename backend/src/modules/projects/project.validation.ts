import { z } from 'zod'

export const projectIdSchema = z
    .string()
    .regex(/^\d+$/, 'Project id must be a positive integer')
    .transform((v) => Number(v))

export const projectCreateSchema = z
    .object({
        name: z.string().trim().min(1, 'Name is required').max(255),
        description: z.string().trim().max(2000).optional()
    })

export const projectUpdateSchema = z
    .object({
        name: z.string().trim().min(1, 'Name is required').max(255),
        description: z.string().trim().max(2000).optional().nullable()
    })