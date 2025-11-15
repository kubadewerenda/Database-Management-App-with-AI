import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import DbConnectionService from './dbconnection.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { BadRequestException, UnauthorizedException } from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'

import { UpsertConnectionSchema } from './dbconnection.validate.js'
import { projectIdSchema } from '../projects/project.validation.js'


class DbConnectionController extends Controller{
    private dbConnectionService: DbConnectionService

    constructor(){
        super()
        this.dbConnectionService = new DbConnectionService()
    }

    private async upsert_connection(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const connectionString = UpsertConnectionSchema.safeParse(req.body)
        if(!connectionString.success) throw connectionString.error

        const userId = req.user!.id

        const result = await this.dbConnectionService.upsert_for_project(
            projectId.data,
            userId,
            connectionString.data
        )

        return res.status(200).json({
            message: 'Database connected successfully.',
            ...result
        })
    }

    private async test_connection(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const result = await this.dbConnectionService.test_saved_connection(projectId.data, userId)

        return res.status(200).json({
            message: 'Your connection is established.',
            ...result
        })
    }
    
    public routes(): void {
        this.router.put('/:projectId/db-connection', userMd.isAuthenticated, asyncHandler(this.upsert_connection.bind(this)))
        this.router.get('/:projectId/db-connection/test', userMd.isAuthenticated, asyncHandler(this.test_connection.bind(this)))
    }
}

export default new DbConnectionController().router