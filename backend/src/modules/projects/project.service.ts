import User from '../../models/users/user.model.js'
import Project from '../../models/projects/project.model.js'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException} from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'

type ProjectCreateData = {
    name: string,
    description?: string | null
}

type ProjectUpdateData = {
    name?: string,
    description?: string | null
}

export default class ProjectService {
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

    public async get_projects_list(userId: number): Promise<Array<Project>> {
        const projects = await Project.findAll({ where: { ownerId: userId }, order: [['created_at', 'DESC']] })
        if(!projects) {
            throw new NotFoundException('Projects not found')
        }

        return projects
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