import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import ProjectService from './project.service.js'
import Project from '../../models/projects/project.model.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { BadRequestException, UnauthorizedException } from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'

import { projectIdSchema, projectCreateSchema, projectUpdateSchema } from './project.validation.js'


class ProjectController extends Controller {
    private projectService: ProjectService

    constructor() {
        super()
        this.projectService = new ProjectService()
    }

    private async get_project(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const project: Project = await this.projectService.get_project(userId, projectId.data)

        return res.status(200).json({ project })
    }

    private async get_projects_list(req: Request, res: Response) {
        const userId = req.user!.id

        const projects: Array<Project> = await this.projectService.get_projects_list(userId) 

        return res.status(200).json({ projects })
    }

    private async create_project(req: Request, res: Response) {
        const parsed = projectCreateSchema.safeParse(req.body)
        if(!parsed.success) throw parsed.error

        const userId = req.user!.id

        const project = await this.projectService.create_project(userId, parsed.data)

        return res.status(201).json(
            { 
                message: 'Project created successfully.',
                project: project
            }
        )
    }

    private async update_project(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsedData = projectUpdateSchema.safeParse(req.body)
        if(!parsedData.success) throw parsedData.error

        const userId = req.user!.id

        const project = await this.projectService.update_project(userId, projectId.data, parsedData.data)

        return res.status(200).json({
            message: 'Project updated successfully',
            project: project
        })
    }

    private async delete_project(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        await this.projectService.delete_project(userId, projectId.data)

        return res.status(200).json({ message: 'Project deleted successfully.'})
    }

    public routes(): void {
        this.router.get('/', userMd.isAuthenticated, asyncHandler(this.get_projects_list.bind(this)))
        this.router.get('/:projectId', userMd.isAuthenticated, asyncHandler(this.get_project.bind(this)))
        this.router.post('/', userMd.isAuthenticated, asyncHandler(this.create_project.bind(this)))
        this.router.patch('/:projectId', userMd.isAuthenticated, asyncHandler(this.update_project.bind(this)))
        this.router.delete('/:projectId', userMd.isAuthenticated, asyncHandler(this.delete_project.bind(this)))
    }
}

export default new ProjectController().router