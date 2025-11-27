import z from 'zod'

export const querySchema = z.object({
    sql: z.string().min(1, 'SQL is required.'),
    explain: z.boolean().optional(),

    executorName: z
        .string()
        .trim()
        .min(1, 'Executor name must be at least 1 character.')
        .max(100, 'Executor name must be at most 100 characters.')
        .optional(),
})

export const executorIdSchema = z.coerce.number().int().positive()

export const executorUpdateSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Executor name must be at least 1 character.')
        .max(100, 'Executor name must be at most 100 characters.'),
})
