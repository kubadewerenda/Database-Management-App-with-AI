import z from 'zod'

export const chatIdSchema = z.coerce.number().int().positive()

export const sendChatMessageSchema = z.object({
    message: z.string().min(1, 'Message is required.')
})

export const chatHistoryInfiniteSchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    beforeId: z.coerce.number().int().positive().optional(),
})