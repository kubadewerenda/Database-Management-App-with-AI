import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import QueryService from './query.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { projectIdSchema } from '../projects/project.validation.js'
import { QuerySchema } from './query.validation.js'


class QueryController extends Controller {
    private queryService: QueryService

    constructor() {
        super()
        this.queryService = new QueryService()
    }
    
    private async execute_query(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsedBody = QuerySchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        const result = await this.queryService.execute_for_project(
            projectId.data,
            userId,
            parsedBody.data
        )

        return res.status(200).json({
            message: 'Query executed successfully.',
            ...result,
        })
    }
    
    public routes(): void {
        this.router.post('/:projectId/query/execute', userMd.isAuthenticated, asyncHandler(this.execute_query.bind(this)))
    }
}

export default new QueryController().router