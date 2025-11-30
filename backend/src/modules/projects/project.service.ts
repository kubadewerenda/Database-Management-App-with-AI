import { 
    BadRequestException, 
    ForbiddenException 
} from '../../lib/errors.js'

import DbConnectionService from '../dbconnections/dbConnection.service.js'
import ChatService from '../chats/chat.service.js'
import ExecutorService from '../executors/executor.service.js'

import Project from '../../models/projects/project.model.js'
import DbConnection from '../../models/dbConnections/dbConnection.model.js'

import * as helpFunctions from '../../lib/utils/functions.js'
import { Op } from 'sequelize'

import { 
    ProjectCreateData, 
    ProjectListOptions, 
    ProjectListResult, 
    ProjectOverview, 
    ProjectUpdateData 
} from '../../types/projects/project.type.js'
import { DbSchemaSnapshot } from '../../types/dbConnections/dbConnection.type.js'

export default class ProjectService {
    private dbConnectionService: DbConnectionService
    private chatService: ChatService
    private executorService: ExecutorService
    
    constructor() {
        this.dbConnectionService = new DbConnectionService()
        this.chatService = new ChatService()
        this.executorService = new ExecutorService()
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

        const [executors, chat] = await Promise.all([
            await this.executorService.listExecutors(
                project.id,
                userId
            ),
            await this.chatService.getOrCreateChatForProject(
                project.id,
                userId
            )
        ])

        let dbConnectionModel: DbConnection | null = null
        let dbConnectionTest: { latencyMs: number } | null = null
        let schema: DbSchemaSnapshot | null = null

        try {
            dbConnectionModel = await this.dbConnectionService.getDbModel(
                projectId,
                userId
            )
        } catch {
            dbConnectionModel = null
        }

        if(dbConnectionModel) {
            try {
                const [testResult, snapshot] = await Promise.all([
                    this.dbConnectionService.testSavedConnection(
                        project.id,
                        userId
                    ),
                    this.dbConnectionService.getSchemaSnapshotForProject(
                        project.id,
                        userId
                    ),
                ])

                dbConnectionTest = testResult ?? null
                schema = snapshot ?? null
            } catch {}
        }

        return {
            message: dbConnectionTest && schema 
                ? 'Project ready to work.'
                : 'Project need to be connected to database.',
            project,
            dbConnection: {
                connected: dbConnectionTest?.latencyMs ? 'yes' : 'no',
                dbType: dbConnectionModel?.dbType ?? null,
                latencyMs: dbConnectionTest?.latencyMs ?? null
            },
            schema: schema ?? { tables: [] },
            executors: executors ?? [],
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