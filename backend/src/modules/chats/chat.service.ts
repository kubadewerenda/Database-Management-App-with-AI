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

type SendMessageData = {
    chatId?: number,
    message: string
}

const MAX_HISTORY_MESSAGES = 20

export default class ChatService {
    private dbConnectionService: DbConnectionService
    private aiProvider: AiProviderService

    constructor() {
        this.dbConnectionService = new DbConnectionService()
        this.aiProvider = new AiProviderService()
    }

    private async _getOrCreateChat(projectId: number, userId: number, chatId?: number): Promise<Chat> {
        if(!projectId || !userId) {
            throw new BadRequestException('Project and user are required.')
        }

        const project = await Project.findOne({
            where: { id: projectId, ownerId: userId }
        })

        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        // if(chatId) {
        //     const chat = await Chat.findOne({
        //         where: { id: chatId, projectId: projectId }
        //     })
        //     if(!chat) {
        //         throw new NotFoundException('Chat not found for this project.')
        //     }
        //     return chat
        // }

        // const newChat = await Chat.create({
        //     projectId,
        //     title: null
        // } as any)

        // return newChat
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

    private async _loadSchemaForProject(projectId: number, userId: number): Promise<DbSchemaSnapshot> {
        const dbConn = await this.dbConnectionService.get_db_model(projectId, userId)
        
        const schema = await SchemaCache.findOne({
            where: { connectionId: dbConn.id }
        })

        if(!schema) {
            throw new NotFoundException('Database schema is not loaded for this project. Please refresh schema.')
        }

        return {
            tables: schema.tables
        }
    }

    private async _getChatHistory(chatId: number): Promise<AiChatMessage[]> {
        const messages = await Message.findAll({
            where: { chatId: chatId },
            order: [['created_at', 'ASC']],
            limit: MAX_HISTORY_MESSAGES
        })

        return messages.map((m) => ({
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

    public async sendMessage(
        projectId: number,
        userId: number,
        { chatId, message }: SendMessageData,
    ) {
        if(!message || !message.trim()) {
            throw new BadRequestException('Message cannot be empty.')
        }

        const chat = await this._getOrCreateChat(projectId, userId, chatId)

        const userMessage = await Message.create({
            chatId: chat.id,
            role: ChatRole.USER,
            content: message,
            sqlDraft: null
        } as any)

        const schema = await this._loadSchemaForProject(projectId, userId)

        const history = await this._getChatHistory(chat.id)

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

        // TODO: dodac title chatu jako p.name + Assistant

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