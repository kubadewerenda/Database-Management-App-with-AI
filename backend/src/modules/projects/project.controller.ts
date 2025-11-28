import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import ProjectService from './project.service.js'
import Project from '../../models/projects/project.model.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'

import { projectIdSchema, projectCreateSchema, projectUpdateSchema, projectListPaginationSchema } from './project.validation.js'


class ProjectController extends Controller {
    private projectService: ProjectService

    constructor() {
        super()
        this.projectService = new ProjectService()
    }

    private async getProject(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const project: Project = await this.projectService.getProject(projectId.data, userId)

        return res.status(200).json({ project })
    }

    private async getProjectOverview(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const projectOverview = await this.projectService.getProjectOverview(projectId.data, userId)

        return res.status(200).json({ projectOverview })
    }

    private async getProjectsList(req: Request, res: Response) {
        const userId = req.user!.id

        const parsedOptions = projectListPaginationSchema.safeParse(req.query)
        if(!parsedOptions.success) throw parsedOptions.error

        const { page, limit, search, order } = parsedOptions.data

        const result = await this.projectService.getProjectsList(
            userId, 
            {
                page,
                limit,
                search,
                order
            }
        )

        return res.status(200).json(result)
    }

    private async createProject(req: Request, res: Response) {
        const parsedBody = projectCreateSchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const project = await this.projectService.createProject(userId, parsedBody.data)

        return res.status(201).json({ 
                message: 'Project created successfully.',
                project: project
        })
    }

    private async updateProject(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsedData = projectUpdateSchema.safeParse(req.body)
        if(!parsedData.success) throw parsedData.error

        const userId = req.user!.id

        const project = await this.projectService.updateProject(projectId.data, userId, parsedData.data)

        return res.status(200).json({
            message: 'Project updated successfully',
            project: project
        })
    }

    private async deleteProject(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        await this.projectService.deleteProject(projectId.data, userId)

        return res.status(200).json({ message: 'Project deleted successfully.'})
    }

    public routes(): void {
        this.router.get('/', userMd.isUserPermitted, asyncHandler(this.getProjectsList.bind(this)))
        this.router.get('/:projectId', userMd.isUserPermitted, asyncHandler(this.getProject.bind(this)))
        this.router.get('/:projectId/overview', userMd.isUserPermitted, asyncHandler(this.getProjectOverview.bind(this)))
        this.router.post('/', userMd.isUserPermitted, asyncHandler(this.createProject.bind(this)))
        this.router.patch('/:projectId', userMd.isUserPermitted, asyncHandler(this.updateProject.bind(this)))
        this.router.delete('/:projectId', userMd.isUserPermitted, asyncHandler(this.deleteProject.bind(this)))
    }
}

export default new ProjectController().router