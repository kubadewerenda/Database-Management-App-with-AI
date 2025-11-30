import { 
    BadRequestException, 
    NotFoundException 
} from '../../lib/errors.js'

import SavedQuery from '../../models/savedQueries/savedQuery.model.js'
import Tag from '../../models/savedQueries/tag.model.js'

import { 
    Op, 
    where 
} from 'sequelize'
import * as helpFunctions from '../../lib/utils/functions.js'

import { SavedQueryPayload } from '../../types/savedQueries/savedQuery.type.js'

export default class SavedQueryService {
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
        await helpFunctions._ensureProjectOwned(projectId, userId)

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
        await helpFunctions._ensureProjectOwned(projectId, userId)

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
        await helpFunctions._ensureProjectOwned(projectId, userId)

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
        await helpFunctions._ensureProjectOwned(projectId, userId)

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
        await helpFunctions._ensureProjectOwned(projectId, userId)

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

    public async listSavedQueriesTags(projectId: number, userId: number) {
        await helpFunctions._ensureProjectOwned(projectId, userId)

        return await Tag.findAll({
            where: { projectId },
            order: [['name', 'ASC']]
        })
    }

    public async deleteSavedQueriesTag(projectId: number, userId: number, tagId: number) {
        await helpFunctions._ensureProjectOwned(projectId, userId)

        const tag = await Tag.findOne({
            where: { id: tagId, projectId }
        })

        if(!tag) {
            throw new NotFoundException("Tag not found.")
        }

        const usedCount = await SavedQuery.count({
            include: [{
                model: Tag,
                where: { id: tagId }
            }]
        })

        if (usedCount > 0) {
            throw new BadRequestException("Cannot delete tag because it is used in saved queries.")
        }

        await (tag as any).$set("savedQueries", [])

        await tag.destroy()
    }
}