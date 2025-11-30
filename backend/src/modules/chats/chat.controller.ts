import { 
    Request, 
    Response 
} from 'express'

import Controller from '../../controllers/main.controller.js'

import ChatService from './chat.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'

import { projectIdSchema } from '../projects/project.validation.js'
import { 
    chatHistoryInfiniteSchema,
    chatIdSchema, 
    sendChatMessageSchema
} from './chat.validation.js'


class ChatController extends Controller {
    private chatService: ChatService

    constructor() {
        super()
        this.chatService = new ChatService()
    }

    private async getChatHistory(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const chatId = chatIdSchema.safeParse(req.params.chatId)
        if(!chatId.success) throw chatId.error

        const parsedQuery = chatHistoryInfiniteSchema.safeParse(req.query)
        if (!parsedQuery.success) throw parsedQuery.error

        const { limit, beforeId } = parsedQuery.data

        const userId = req.user!.id

        const chatHistory = await this.chatService.getChatHistory(
            projectId.data, 
            chatId.data,
            userId,
            {
                limit,
                beforeId,
            }
        )

        return res.status(200).json(chatHistory)
    }

    private async clearChatHistory(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const chatId = chatIdSchema.safeParse(req.params.chatId)
        if(!chatId.success) throw chatId.error

        const userId = req.user!.id

        await this.chatService.clearChatHistory(
            projectId.data, 
            chatId.data,
            userId
        )

        return res.status(200).json({
            message: 'Chat history cleaned.'
        })
    }

    private async sendMessage(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const chatId = chatIdSchema.safeParse(req.params.chatId)
        if(!chatId.success) throw chatId.error

        const parsedBody = sendChatMessageSchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const result = await this.chatService.sendMessage(
            projectId.data,
            chatId.data,
            userId,
            parsedBody.data
        )

        return res.status(200).json({
            message: 'AI processed your message.',
            ...result,
        })
    }
    
    public routes(): void {
        this.router.get('/:projectId/chat/:chatId/history', userMd.isUserPermitted, asyncHandler(this.getChatHistory.bind(this)))
        this.router.delete('/:projectId/chat/:chatId/history/clear', userMd.isUserPermitted, asyncHandler(this.clearChatHistory.bind(this)))
        this.router.post('/:projectId/chat/:chatId/message', userMd.isUserPermitted, asyncHandler(this.sendMessage.bind(this)))
    }
}

export default new ChatController().router