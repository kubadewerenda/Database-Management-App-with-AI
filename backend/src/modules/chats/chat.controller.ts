import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import ChatService from './chat.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { BadRequestException, UnauthorizedException } from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'

import { projectIdSchema } from '../projects/project.validation.js'
import { sendChatMessageSchema } from './chat.validation.js'


class ChatController extends Controller {
    private chatService: ChatService

    constructor() {
        super()
        this.chatService = new ChatService()
    }

    private async getChatHistory(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const limit = req.query.limit ? Number(req.query.limit) : undefined
        const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined

        const chatHistory = await this.chatService.getChatHistory(projectId.data, userId, 
            {
                limit,
                beforeId,
        })

        return res.status(200).json({
            ...chatHistory
        })
    }

    private async sendMessage(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsedBody = sendChatMessageSchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const result = await this.chatService.sendMessage(
            projectId.data,
            userId,
            parsedBody.data
        )

        return res.status(200).json({
            message: 'AI processed your message.',
            ...result,
        })
    }
    
    public routes(): void {
        this.router.get('/:projectId/chat/history', userMd.isUserPermitted, asyncHandler(this.getChatHistory.bind(this)))
        this.router.post('/:projectId/chat/message', userMd.isUserPermitted, asyncHandler(this.sendMessage.bind(this)))
    }
}

export default new ChatController().router