import z from 'zod'

export const sendChatMessageSchema = z.object({
    // chatId: z.number().int().positive().optional(),
    message: z.string().min(1, 'Message is required.')
})