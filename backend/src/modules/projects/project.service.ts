import User from '../../models/users/user.model.js'
import Project from '../../models/projects/project.model.js'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException} from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'
import { Op } from 'sequelize'

import { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'

import DbConnectionService from '../dbconnections/dbConnection.service.js'
import ChatService from '../chats/chat.service.js'

type ProjectCreateData = {
    name: string,
    description?: string | null
}

type ProjectUpdateData = {
    name?: string,
    description?: string | null
}

type ProjectOverview = {
    project: Project,
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
    private async _findOwned(userId: number, projectId: number) {
        const project = await Project.findByPk(projectId)
        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        if(project.ownerId !== userId) {
            throw new ForbiddenException('You do not have perrmissions to this project.')
        }

        return project
    }

    public async get_project(userId: number, projectId: number): Promise<Project> {
        const project = await this._findOwned(userId, projectId)
        
        return project
    }

    public async getProjectOverview(userId: number, projectId: number): Promise<ProjectOverview> {
        const project = await this._findOwned(userId, projectId)

        // TODO: zmodyfikowac, to ma tylko rzucac wyjatek
        const dbConnectionTest = await this.dbConnectionService.testSavedConnection(
            project.id,
            userId
        )

        const schema = await this.dbConnectionService.getSchemaSnapshotForProject(
            project.id,
            userId
        )

        const chat = await this.chatService.getOrCreateChatForProject(
            project.id,
            userId
        )

        // TODO: dodac title chatu

        return {
            project,
            schema,
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

    public async create_project(userId: number, { name, description }: ProjectCreateData): Promise<Project> {
        if(!name) {
            throw new BadRequestException('Project name is required.')
        }

        const project = await Project.create({
            name,
            description: description ?? null,
            ownerId: userId
        }as any)

        return project
    }

    public async update_project(userId: number, projectId: number, { name, description }: ProjectUpdateData): Promise<Project> {
        const project = await this._findOwned(userId, projectId)
        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        if(project.ownerId !== userId) {
            throw new ForbiddenException('You do not have perrmissions to this project.')
        }

        if(name !== undefined) {
            project.name = name
        }

        if(description !== undefined) {
            project.description = description
        }

        await project.save()

        return project
    }

    public async delete_project(userId: number, projectId: number) {
        const project = await this._findOwned(userId, projectId)
        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        if(project.ownerId !== userId) {
            throw new ForbiddenException('You do not have perrmissions to this project.')
        }

        await project.destroy()
    }
}