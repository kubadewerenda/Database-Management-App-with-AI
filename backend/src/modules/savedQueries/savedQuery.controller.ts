import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import SavedQueryService from './savedQuery.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'
import { projectIdSchema } from '../projects/project.validation.js'
import { savedQueryIdSchema, savedQueryListInfiniteSchema, savedQuerySchema, savedQueryUpdateSchema } from './savedQuery.validation.js'


class SavedQueryController extends Controller {
    private savedQueryService: SavedQueryService

    constructor() {
        super()
        this.savedQueryService = new SavedQueryService()
    }

    private async addSavedQuery(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsedBody = savedQuerySchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        await this.savedQueryService.addSavedQuery(
            projectId.data,
            userId,
            parsedBody.data
        )

        return res.status(201).json({
            message: 'Query saved successfully!'
        })
    }

    private async getSavedQuery(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const savedQueryId = savedQueryIdSchema.safeParse(req.params.savedQueryId)
        if(!savedQueryId.success) throw savedQueryId.error

        const userId = req.user!.id

        const savedQuery = await this.savedQueryService.getSavedQuery(
            projectId.data,
            userId,
            savedQueryId.data
        )

        return res.status(200).json({ savedQuery })
    }

    private async updateSavedQuery(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const savedQueryId = savedQueryIdSchema.safeParse(req.params.savedQueryId)
        if(!savedQueryId.success) throw savedQueryId.error

        const parsedBody = savedQueryUpdateSchema.safeParse(req.body)
        if(!parsedBody.success) throw parsedBody.error

        const userId = req.user!.id

        await this.savedQueryService.updateSavedQuery(
            projectId.data,
            userId,
            savedQueryId.data,
            parsedBody.data
        )

        return res.status(200).json({
            message: 'Saved query updated successfully!'
        })
    }

    private async deleteSavedQuery(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const savedQueryId = savedQueryIdSchema.safeParse(req.params.savedQueryId)
        if(!savedQueryId.success) throw savedQueryId.error

        const userId = req.user!.id

        await this.savedQueryService.deleteSavedQuery(
            projectId.data,
            userId,
            savedQueryId.data
        )

        return res.status(200).json({ message: 'Saved query deleted.' })
    }

    private async listSavedQueriesInfinite(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const parsed = savedQueryListInfiniteSchema.safeParse(req.query)
        if(!parsed.success) throw parsed.error

        const userId = req.user!.id

        const result = await this.savedQueryService.getSavedQueryList(
            projectId.data,
            userId,
            parsed.data
        )

        return res.status(200).json(result)
    }

    private async listProjectTags(req: Request, res: Response) {
        const projectId = projectIdSchema.safeParse(req.params.projectId)
        if(!projectId.success) throw projectId.error

        const userId = req.user!.id

        const tags = await this.savedQueryService.listProjectTags(projectId.data, userId)

        return res.status(200).json({ ...tags })
    }
    
    public routes(): void {
        this.router.post('/:projectId/query/saved', userMd.isAuthenticated, asyncHandler(this.addSavedQuery.bind(this)))
        this.router.get('/:projectId/query/saved', userMd.isAuthenticated, asyncHandler(this.listSavedQueriesInfinite.bind(this)))
        this.router.get('/:projectId/query/saved/:savedQueryId', userMd.isAuthenticated, asyncHandler(this.getSavedQuery.bind(this)))
        this.router.patch('/:projectId/query/saved/:savedQueryId', userMd.isAuthenticated, asyncHandler(this.updateSavedQuery.bind(this)))
        this.router.delete('/:projectId/query/saved/:savedQueryId', userMd.isAuthenticated, asyncHandler(this.deleteSavedQuery.bind(this)))
        
        this.router.get('/:projectId/query/tags', userMd.isAuthenticated, asyncHandler(this.listProjectTags.bind(this)))
    }
}

export default new SavedQueryController().router