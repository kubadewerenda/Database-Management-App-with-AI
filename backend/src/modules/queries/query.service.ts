import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import { Op, where } from 'sequelize'
import DbConnectionService from '../dbconnections/dbConnection.service.js'

import Execution from '../../models/queries/execution.model.js'
import SavedQuery from '../../models/queries/savedQuery.model.js'
import Tag from '../../models/queries/tag.model.js'
import Project from '../../models/projects/project.model.js'

import { Client } from 'pg'

type QueryData = {
    sql: string
    explain?: boolean
}

type SavedQueryPayload = {
    name: string
    description?: string | null
    sql: string
    tags?: string[]
}


const MAX_RETURNED_ROWS = 500


export default class QueryService {
    private dbConnectionService: DbConnectionService

    constructor() {
        this.dbConnectionService = new DbConnectionService()
    }

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

    private _validateSelectOnly(sql: string) {
        const trimmed = sql.trim()

        const withoutTrallingSemmis = trimmed.replace(/;+\s*$/, '')
        if(withoutTrallingSemmis.includes(';')) {
            throw new BadRequestException('Multiple SQL statements are not allowed.')
        }

        const lower = withoutTrallingSemmis.toLowerCase()
        const startsWithSelect = lower.startsWith('select')
        const startsWithWith = lower.startsWith('with')

        if(!startsWithSelect && !startsWithWith) {
            throw new BadRequestException('Only SELECT queries (including WITH CTE) are allowed.')
        }
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

    public async executeForProject(
        projectId: number,
        userId: number,
        { sql, explain }: QueryData
    ) {
        await this._ensureProjectOwned(projectId, userId)

        this._validateSelectOnly(sql)

        const dbConn = await this.dbConnectionService.getDbModel(projectId, userId)
        const connectionString = this.dbConnectionService.buildConnectionStringFromModel(dbConn)

        const client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            },
        })

        let explained: unknown | null = null
        let rowCount: number | null = null
        let durationMs: number | null = null
        let returnedRows: any[] = []
        let fields: any[] = []
        let truncated = false

        const started = Date.now()

        try {
            await client.connect()

            if(explain) {
                const explainSQL = `EXPLAIN (FORMAT JSON) ${sql.replace(/;+\s*$/, '')}`
                const explainResp = await client.query(explainSQL)
                explained = (explainResp.rows?.[0] && (explainResp.rows?.[0]['QUERY PLAN'] ?? explainResp.rows?.[0]['query_plan'])) ?? explainResp.rows ?? null
            }

            const resp = await client.query(sql)

            durationMs = Date.now() - started
            rowCount = typeof resp.rowCount === 'number' ? resp.rowCount: (resp.rows?.length ?? null)

            const rows = resp.rows ?? []
            fields = resp.fields?.map(f => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
                tableID: f.tableID,
                columnID: f.columnID
            })) ?? []

            if(rows.length > MAX_RETURNED_ROWS) {
                truncated = true
                returnedRows = rows.slice(0, MAX_RETURNED_ROWS)
            } else {
                returnedRows = rows
            }

            const execution = await Execution.create({
                projectId: projectId,
                connectionId: dbConn.id,
                sql,
                rows: rowCount,
                durationMs,
                explained,
            } as any)

            return {
                executionId: execution.id,
                rows: returnedRows,
                fields,
                rowCount,
                durationMs,
                truncated,
                explain: explained,
            }
        } catch (err: any) {
            const dbError = {
                message: err.message,
                code: err.code,         
                detail: err.detail,      
                hint: err.hint,          
                position: err.position,  
                schema: err.schema,
                table: err.table,
                column: err.column,
            }

            const prettyMessageParts = []

            if (dbError.message) prettyMessageParts.push(dbError.message)
            if (dbError.code) prettyMessageParts.push(`(error code: ${dbError.code})`)
            if (dbError.position) prettyMessageParts.push(`at position ${dbError.position}`)
            if (dbError.table) prettyMessageParts.push(`in table "${dbError.table}"`)

            const prettyMessage = `Query failed: ${prettyMessageParts.join(' ')}`
            
            throw new BadRequestException(prettyMessage)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }
}