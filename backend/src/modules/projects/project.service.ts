import Project from '../../models/projects/project.model.js'
import { BadRequestException, ForbiddenException } from '../../lib/errors.js'
import * as helpFunctions from '../../lib/utils/functions.js'
import { Op } from 'sequelize'

import { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'

import DbConnectionService from '../dbconnections/dbConnection.service.js'
import ChatService from '../chats/chat.service.js'

type ProjectCreateData = {
    name: string,
    description?: string | null
    color?: string | null
}

type ProjectUpdateData = {
    name?: string,
    description?: string | null
    color?: string | null
}

type ProjectOverview = {
    message: string,
    project: Project,
    dbConnection: {
        connected: string
        latencyMs: number | null
    }
    schema: DbSchemaSnapshot,
    chat: {
        id: number
    }
}

type ProjectListOptions = {
    page?: number
    limit?: number
    search?: string
    order?: string
}

type ProjectListResult = {
    projects: Project[]
    page: number
    limit: number
    total: number
    totalPages: number
}

export default class ProjectService {
    private dbConnectionService: DbConnectionService
    private chatService: ChatService
    
    constructor() {
        this.dbConnectionService = new DbConnectionService()
        this.chatService = new ChatService()
    }
    private async _findOwned(projectId: number, userId: number) {
        return await helpFunctions._ensureProjectOwned(projectId, userId)
    }

    public async getProject(projectId: number, userId: number): Promise<Project> {
        const project = await this._findOwned(projectId, userId)
        
        return project
    }

    public async getProjectOverview(projectId: number, userId: number): Promise<ProjectOverview> {
        const project = await this._findOwned(projectId, userId)

        let dbConnection = null
        try {
            dbConnection = await this.dbConnectionService.testSavedConnection(
                project.id,
                userId
            )
        } catch {}

        let schema = null
        try {
            schema = await this.dbConnectionService.getSchemaSnapshotForProject(
                project.id,
                userId
            )
        } catch {}

        const chat = await this.chatService.getOrCreateChatForProject(
            project.id,
            userId
        )

        return {
            message: dbConnection && schema 
                ? 'Project ready to work.'
                : 'Project need to be connected to database.',
            project,
            dbConnection: {
                connected: dbConnection?.latencyMs ? 'yes' : 'no',
                latencyMs: dbConnection?.latencyMs ?? null
            },
            schema: schema ?? { tables: [] },
            chat : {
                id: chat.id
            }
        }
    }

    public async getProjectsList(userId: number, options?: ProjectListOptions): Promise<ProjectListResult> {
        const page = options?.page && options.page > 0 ? options.page : 1
        const limit = options?.limit && options.limit > 0 && options.limit <= 100 
            ? options.limit
            : 20
        const search = options?.search?.trim() || undefined
        const order: 'ASC' | 'DESC' =
            options?.order === 'ASC' || options?.order === 'DESC'
                ? options.order
                : 'DESC'

        const offset = (page - 1) * limit

        const where: any = { ownerId: userId }

        if(search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ]
        }

        const { rows, count } = await Project.findAndCountAll({ 
            where, 
            order: [['created_at', order]],
            limit,
            offset,
        })

        const totalPages = Math.ceil(count / limit) || 1

        return {
            projects: rows,
            page,
            limit,
            total: count,
            totalPages
        }
    }

    public async createProject(userId: number, { name, description, color }: ProjectCreateData) {
        if(!name) {
            throw new BadRequestException('Project name is required.')
        }

        return await Project.create({
            name,
            description: description ?? null,
            color: color ?? null,
            isActive: false,
            ownerId: userId
        } as any)
    }

    public async updateProject(projectId: number, userId: number, { name, description, color }: ProjectUpdateData): Promise<Project> {
        const project = await this._findOwned(projectId, userId)
        
        if(project.ownerId !== userId) {
            throw new ForbiddenException('You do not have perrmissions to this project.')
        }

        if(name !== undefined) {
            project.name = name
        }

        if(description !== undefined) {
            project.description = description
        }

        if(color !== undefined) {
            project.color = color
        }

        await project.save()

        return project
    }

    public async deleteProject(projectId: number, userId: number) {
        const project = await this._findOwned(projectId, userId)

        if(project.ownerId !== userId) {
            throw new ForbiddenException('You do not have perrmissions to this project.')
        }

        await project.destroy()
    }
}