import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import Project from '../../models/projects/project.model.js'
import Chat from '../../models/chat/chat.model.js'
import Message from '../../models/chat/message.model.js'
import SchemaCache from '../../models/projects/schemaCache.model.js'
import DbConnectionService from '../dbconnections/dbconnection.service.js'
import AiProviderService from '../aiProvider/aiProvider.service.js'
import { AiChatMessage } from '../../types/ai/aiProvider.js'
import { ChatRole } from '../../enums/messages/messages.enum.js'
import type { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'
import { Op } from 'sequelize'

type SendMessageData = {
    message: string
}

type ChatHistoryMessage = {
    id: number
    role: 'user' | 'assistant' | 'system'
    content: string
    sqlDraft: string | null
    createdAt: Date
}

type ChatHistoryResult = {
    messages: ChatHistoryMessage[]
    nextCursor: number | null     
    hasMore: boolean
}


const MAX_HISTORY_MESSAGES = 20

export default class ChatService {
    private dbConnectionService: DbConnectionService
    private aiProvider: AiProviderService

    constructor() {
        this.dbConnectionService = new DbConnectionService()
        this.aiProvider = new AiProviderService()
    }

    private async _getOrCreateChat(projectId: number, userId: number): Promise<Chat> {
        if(!projectId || !userId) {
            throw new BadRequestException('Project and user are required.')
        }

        const project = await Project.findOne({
            where: { id: projectId, ownerId: userId }
        })

        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        let chat = await Chat.findOne({
            where: { projectId: projectId }
        })
        if(!chat) {
            chat = await Chat.create({
                projectId,
                title: null
            } as any)
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

    // private async _loadSchemaForProject(projectId: number, userId: number): Promise<DbSchemaSnapshot> {
    //     const dbConn = await this.dbConnectionService.get_db_model(projectId, userId)
        
    //     const schema = await SchemaCache.findOne({
    //         where: { connectionId: dbConn.id }
    //     })

    //     if(!schema) {
    //         throw new NotFoundException('Database schema is not loaded for this project. Please refresh schema.')
    //     }

    //     return {
    //         tables: schema.tables
    //     }
    // }

    private async _getChatHistoryForAi(chatId: number): Promise<AiChatMessage[]> {
        const messages = await this._getRawMessages(chatId, MAX_HISTORY_MESSAGES)

        const ordered = [...messages].reverse() 

        return ordered.map((m) => ({
            role:
                m.role === ChatRole.USER
                    ? 'user'
                    : m.role === ChatRole.ASSISTANT
                        ? 'assistant'
                        : 'system',
            content: m.content,
            sqlDraft: m.sqlDraft ?? null,
        }))
    }

    public async getOrCreateChatForProject(
        projectId: number, 
        userId: number,
        options?: { 
            limit?: number,
            beforeId?: number
        }
    ): Promise<Chat> {
        return this._getOrCreateChat(projectId, userId)
    }

    public async getChatHistory(
        projectId: number, 
        userId: number,
        options?: { limit?: number; beforeId?: number },
    ): Promise<ChatHistoryResult> {
        const limit = options?.limit && options.limit > 0 ? options.limit : MAX_HISTORY_MESSAGES
        const beforeId = options?.beforeId

        const chat = await this._getOrCreateChat(projectId, userId)
        if(!chat) {
            throw new NotFoundException('Chat not found for this project.')
        }

        const rawMessages = await this._getRawMessages(chat.id, limit, beforeId)

        const ordered = [...rawMessages].reverse()

        const messages: ChatHistoryMessage[] = ordered.map((m) => ({
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

        return {
            messages,
            nextCursor,
            hasMore: rawMessages.length === limit,
        }
    }

    public async sendMessage(
        projectId: number,
        userId: number,
        { message }: SendMessageData,
    ) {
        if(!message || !message.trim()) {
            throw new BadRequestException('Message cannot be empty.')
        }

        const chat = await this._getOrCreateChat(projectId, userId)

        const userMessage = await Message.create({
            chatId: chat.id,
            role: ChatRole.USER,
            content: message,
            sqlDraft: null
        } as any)

        const schema = await this.dbConnectionService.get_schema_snapshot_for_project(projectId, userId)

        const history = await this._getChatHistoryForAi(chat.id)

        const aiResp = await this.aiProvider.generateSQLFromNeutralLanguage({
            schema,
            messages: history,
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