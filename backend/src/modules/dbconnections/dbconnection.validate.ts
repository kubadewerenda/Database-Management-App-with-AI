import z from 'zod'

export const UpsertConnectionSchema = z.object({
    connectionString: z.string().min(1, 'Connection string is required.'),
    name: z.string().min(1).optional(),
    readOnly: z.boolean().optional(),
})