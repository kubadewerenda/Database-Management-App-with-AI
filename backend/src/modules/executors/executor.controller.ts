import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import ExecutorService from './executor.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { projectIdSchema } from '../projects/project.validation.js'
import {
    querySchema,
    executorIdSchema,
    executorUpdateSchema,
} from './executor.validate.js'

class QueryController extends Controller {
    private executorService: ExecutorService

    constructor() {
        super()
        this. executorService = new  ExecutorService()
    }

    private async execute_query(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if (!projectId.success) throw projectId.error

        const executorId = executorIdSchema.safeParse(req.params.executorId)
        if (!executorId.success) throw executorId.error

        const parsedBody = querySchema.safeParse(req.body)
        if (!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const result = await this. executorService.executeQuery(
            projectId.data,
            userId,
            executorId.data,
            parsedBody.data,
        )

        return res.status(200).json({
            message: 'Query executed successfully.',
            ...result,
        })
    }

    private async createExecutor(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const executor = await this.executorService.createExecutor(projectId.data, userId)

        return res.status(201).json({
            message: 'Executor created successfully.',
            executor
        })
    }

    private async list_executors(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if (!projectId.success) throw projectId.error

        const userId = req.user!.id

        const executors = await this. executorService.listExecutors(
            projectId.data,
            userId,
        )

        return res.status(200).json({
            items: executors,
        })
    }

    private async update_executor(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if (!projectId.success) throw projectId.error

        const executorId = executorIdSchema.safeParse(req.params.executorId)
        if (!executorId.success) throw executorId.error

        const parsedBody = executorUpdateSchema.safeParse(req.body)
        if (!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const executor = await this. executorService.renameExecutor(
            projectId.data,
            userId,
            executorId.data,
            parsedBody.data.name,
        )

        return res.status(200).json({
            message: 'Executor updated successfully.',
            executor,
        })
    }

    public routes(): void {
        this.router.post('/:projectId/executors/:executorId/execute', userMd.isAuthenticated, asyncHandler(this.execute_query.bind(this)))
        this.router.post('/:projectId/executors', userMd.isAuthenticated, asyncHandler(this.createExecutor.bind(this)))
        this.router.get('/:projectId/executors', userMd.isAuthenticated, asyncHandler(this.list_executors.bind(this)))
        this.router.patch('/:projectId/executors/:executorId', userMd.isAuthenticated, asyncHandler(this.update_executor.bind(this)))
    }
}

export default new QueryController().router
