import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import { Op, where } from 'sequelize'

import SavedQuery from '../../models/queries/savedQuery.model.js'
import Tag from '../../models/queries/tag.model.js'
import Project from '../../models/projects/project.model.js'


type SavedQueryPayload = {
    name: string
    description?: string | null
    sql: string
    tags?: string[]
}


export default class SavedQueryService {

    private async _ensureProjectOwned(projectId: number, userId: number): Promise<Project> {
        if (!projectId || !userId) {
            throw new BadRequestException('Project and user are required.')
        }

        const project = await Project.findOne({
            where: { id: projectId, ownerId: userId }
        })

        if (!project) {
            throw new NotFoundException('Project not found.')
        }

        return project
    }

    private async _getOrCreateTags(projectId: number, tagNames?: string[]): Promise<Tag[]> {
        if(!tagNames || tagNames.length === 0) return []

        const unique = Array.from(new Set(tagNames.map(t => t.trim()).filter(Boolean)))

        const tags: Tag[] = []

        for(const name of unique) {
            const [tag] = await Tag.findOrCreate({
                where: { name, projectId },
                defaults: { name, projectId } as any
            })
            tags.push(tag)
        }

        return tags
    }

    public async addSavedQuery(
        projectId: number,
        userId: number,
        payload: SavedQueryPayload
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const { name, description = null, sql, tags } = payload

        if(!sql || !sql.trim()) {
            throw new BadRequestException('SQL is required.')
        }

        const savedQuery = await SavedQuery.create({
            projectId,
            name,
            description,
            sql
        } as any)

        if(tags && tags.length) {
            const tagModels = await this._getOrCreateTags(projectId, tags)
            await (savedQuery as any).$set('tags', tagModels)
        }
    }

    public async getSavedQuery(
        projectId: number,
        userId: number,
        savedQueryId: number
    ): Promise<SavedQuery> {
        await this._ensureProjectOwned(projectId, userId)

        const sq = await SavedQuery.findOne({
            where: { id: savedQueryId, projectId: projectId },
            include: [{ model: Tag, through: { attributes: [] } }]
        })

        if(!sq) throw new NotFoundException('Saved query not found.')

        return sq
    }

    public async updateSavedQuery(
        projectId: number,
        userId: number,
        savedQueryId: number,
        payload: Partial<SavedQueryPayload>
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const sq = await SavedQuery.findOne({
            where: { id: savedQueryId, projectId: projectId }
        })

        if(!sq) throw new NotFoundException('Saved query not found.')

        if (payload.name !== undefined) sq.name = payload.name
        if (payload.description !== undefined) sq.description = payload.description ?? null
        if (payload.sql !== undefined) sq.sql = payload.sql

        await sq.save()

        if (payload.tags) {
            const tagModels = await this._getOrCreateTags(projectId, payload.tags)
            await (sq as any).$set('tags', tagModels)
        }
    }

    public async deleteSavedQuery(
        projectId: number,
        userId: number,
        savedQueryId: number
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const sq = await SavedQuery.findOne({
            where: { id: savedQueryId, projectId: projectId }
        })

        if(!sq) throw new NotFoundException('Saved query not found.')

        await sq.destroy()
    }

    public async getSavedQueryList(
        projectId: number,
        userId: number,
        options?: { 
            limit?: number
            tag?: string
            beforeId?: number 
        }
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const limit = options?.limit && options.limit > 0 ? options.limit : 20
        const beforeId = options?.beforeId
        const tag = options?.tag

        const where: any = { projectId }

        if(beforeId) {
            where.id = { [Op.lt]: beforeId }
        }

        const include: any[] = [
            { model: Tag, through: { attributes: [] } }
        ]

        if(tag) {
            include[0].where = { name: tag, projectId }
            include[0].required = true
        }

        const sQueries = await SavedQuery.findAll({
            where,
            include,
            order: [['id', 'DESC']],
            limit
        })

        const hasMore = sQueries.length === limit
        const nextCursor = hasMore ? sQueries[sQueries.length - 1].id : null

        return {
            sQueries,
            nextCursor,
            hasMore,
        }
    }

    public async listProjectTags(projectId: number, userId: number) {
        await this._ensureProjectOwned(projectId, userId)

        return await Tag.findAll({
            where: { projectId },
            order: [['name', 'ASC']]
        })
    }
}