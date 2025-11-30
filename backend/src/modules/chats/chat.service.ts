import { 
    BadRequestException, 
    NotFoundException 
} from '../../lib/errors.js'

import DbConnectionService from '../dbConnection/dbConnection.service.js'
import AiProviderService from '../aiProvider/aiProvider.service.js'

import Chat from '../../models/chats/chat.model.js'
import Message from '../../models/chats/message.model.js'

import { Op } from 'sequelize'
import * as helpFunctions from '../../lib/utils/functions.js'

import { 
    ChatHistoryMessage, 
    ChatHistoryResult, 
    SendMessageData 
} from '../../types/chats/chat.type.js'
import { ChatMessage } from '../../types/ai/aiProvider.type.js'
import { ChatHistoryForAiLimit, ChatRole } from '../../enums/chats/chat.enum.js'

export default class ChatService {
    private dbConnectionService: DbConnectionService
    private aiProvider: AiProviderService

    constructor() {
        this.dbConnectionService = new DbConnectionService()
        this.aiProvider = new AiProviderService()
    }

    private async _getChatOrThrow(
        projectId: number,
        chatId: number,
        userId: number,
    ): Promise<Chat> {
        await helpFunctions._ensureProjectOwned(projectId, userId)

        const chat = await Chat.findOne({
            where: { id: chatId, projectId },
        })

        if(!chat) {
            throw new NotFoundException('Chat not found for this project.',)
        }

        return chat
    }

    private async _getRawMessages(
        chatId: number,
        limit: number,
        beforeMessageId?: number
    ): Promise<Message[]> {
        const where: any = { chatId }

        if(beforeMessageId) {
            where.id = { [Op.lt]: beforeMessageId }
        }

        return await Message.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
        })
    }

    private _mapMessagesToAiHistory(messages: Message[]): ChatMessage[] {
        const ordered = [...messages].reverse()

        return ordered.map(m => ({
            role: m.role === ChatRole.USER
                    ? 'user'
                    : m.role === ChatRole.ASSISTANT
                        ? 'assistant'
                        : 'system',
            content: m.content,
            sqlDraft: m.sqlDraft ?? null,
        }))
    }

    private _mapMessagesToHistoryResult(
        messages: Message[],
    ): { items: ChatHistoryMessage[]; nextCursor: number | null } {
        const ordered = [...messages].reverse()

        const resultItems: ChatHistoryMessage[] = ordered.map(m => ({
            id: m.id,
            role:
                m.role === ChatRole.USER
                    ? 'user'
                    : m.role === ChatRole.ASSISTANT
                    ? 'assistant'
                    : 'system',
            content: m.content,
            sqlDraft: m.sqlDraft ?? null,
            createdAt: m.createdAt,
        }))

        const oldest = ordered[0]
        const nextCursor = oldest ? oldest.id : null

        return { items: resultItems, nextCursor }
    }

    public async getOrCreateChatForProject(
        projectId: number, 
        userId: number,
    ): Promise<Chat> {
        const project = await helpFunctions._ensureProjectOwned(projectId, userId)

        let chat = await Chat.findOne({
            where: { projectId: project.id },
        })

        if(!chat) {
            chat = await Chat.create({
                projectId: project.id,
                title: null,
            } as any)
        }

        return chat    
    }

    public async getChatHistory(
        projectId: number, 
        chatId: number,
        userId: number,
        options?: { limit?: number; beforeId?: number },
    ): Promise<ChatHistoryResult> {
        const limit = options?.limit && options.limit > 0 ? options.limit : ChatHistoryForAiLimit.MAX_HISTORY_MESSAGES
        const beforeId = options?.beforeId

        const chat = await this._getChatOrThrow(projectId, chatId, userId)
        if(!chat) {
            throw new NotFoundException('Chat not found for this project.')
        }

        const rawMessages = await this._getRawMessages(chat.id, limit, beforeId)

        const { items, nextCursor } = this._mapMessagesToHistoryResult(rawMessages)

        return {
            messages: items,
            nextCursor,
            hasMore: rawMessages.length === limit,
        }
    }

    public async clearChatHistory(
        projectId: number,
        chatId: number,
        userId: number
    ) {
        await helpFunctions._ensureProjectOwned(projectId, userId)

        const chat = await this._getChatOrThrow(projectId, chatId, userId)

        await Message.destroy({
            where: { chatId: chat.id }
        })
    }

    public async sendMessage(
        projectId: number,
        chatId: number,
        userId: number,
        { message }: SendMessageData,
    ) {
        if(!message || !message.trim()) {
            throw new BadRequestException('Message cannot be empty.')
        }

        const chat = await this._getChatOrThrow(projectId, chatId, userId)

        const userMessage = await Message.create({
            chatId: chat.id,
            role: ChatRole.USER,
            content: message,
            sqlDraft: null
        } as any)

        const schema = await this.dbConnectionService.getSchemaSnapshotForProject(projectId, userId)

        const dbConn = await this.dbConnectionService.getDbModel(projectId, userId)
        const dbType = this.dbConnectionService.getDbType(dbConn)

        const history = await this._getRawMessages(chat.id, ChatHistoryForAiLimit.MAX_HISTORY_MESSAGES)
        const historyForAi = this._mapMessagesToAiHistory(history)

        const aiResp = await this.aiProvider.generateSQLFromNeutralLanguage(
        {
            schema,
            dbType,
            messages: historyForAi,
            userMessage: message,
        })

        const assistantMessage = await Message.create({
            chatId: chat.id,
            role: ChatRole.ASSISTANT,
            content: aiResp.explanation,
            sqlDraft: aiResp.sql
        } as any)

        return {
            chatId: chat.id,
            userMessage: {
                id: userMessage.id,
                role: userMessage.role,
                content: userMessage.content,
            },
            assistantMessage: {
                id: assistantMessage.id,
                role: assistantMessage.role,
                content: assistantMessage.content,
                sqlDraft: assistantMessage.sqlDraft,
            },
        }
    }
}