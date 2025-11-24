import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import DbConnectionService from './dbConnection.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'

import { UpsertConnectionSchema } from './dbConnection.validation.js'
import { projectIdSchema } from '../projects/project.validation.js'


class DbConnectionController extends Controller {
    private dbConnectionService: DbConnectionService

    constructor() {
        super()
        this.dbConnectionService = new DbConnectionService()
    }

    private async upsertConnection(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const connectionString = UpsertConnectionSchema.safeParse(req.body)
        if(!connectionString.success) throw connectionString.error

        const userId = req.user!.id

        const result = await this.dbConnectionService.upsertForProject(
            projectId.data,
            userId,
            connectionString.data
        )

        return res.status(200).json({
            message: 'Database connected successfully.',
            ...result
        })
    }

    private async testConnection(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const result = await this.dbConnectionService.testSavedConnection(projectId.data, userId)

        return res.status(200).json({
            message: 'Your connection is ok.',
            ...result
        })
    }

    private async refreshSchema(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        await this.dbConnectionService.refreshSchemaForProject(
            projectId.data,
            userId
        )

        return res.status(200).json({
            message: 'Schema refreshed successfully.',
        })
    }
    
    public routes(): void {
        this.router.put('/:projectId/db-connection', userMd.isAuthenticated, asyncHandler(this.upsertConnection.bind(this)))
        this.router.get('/:projectId/db-connection/test', userMd.isAuthenticated, asyncHandler(this.testConnection.bind(this)))
        this.router.post('/:projectId/db-connection/schema/refresh', userMd.isAuthenticated, asyncHandler(this.refreshSchema.bind(this)))
    }
}

export default new DbConnectionController().router