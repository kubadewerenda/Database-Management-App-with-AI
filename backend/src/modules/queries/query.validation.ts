import z from 'zod'

export const QuerySchema = z.object({
    sql: z.string().min(1, 'SQL is required.'),
    explain: z.boolean().optional(),
})
