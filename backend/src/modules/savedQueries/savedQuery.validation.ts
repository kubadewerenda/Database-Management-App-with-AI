import z from 'zod'

export const savedQueryIdSchema = z
    .string()
    .regex(/^\d+$/, 'Project id must be a positive integer')
    .transform((v) => Number(v))

export const savedQuerySchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional().nullable(),
    sql: z.string().min(1),
    tags: z.array(z.string().min(1)).max(10).optional(),
})

export const savedQueryUpdateSchema = savedQuerySchema.partial()

export const savedQueryListInfiniteSchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    beforeId: z.coerce.number().int().positive().optional(),
    tag: z.string().trim().min(1).optional(),
})
