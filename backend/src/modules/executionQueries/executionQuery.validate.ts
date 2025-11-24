import z from 'zod'

export const querySchema = z.object({
    sql: z.string().min(1, 'SQL is required.'),
    explain: z.boolean().optional(),
})