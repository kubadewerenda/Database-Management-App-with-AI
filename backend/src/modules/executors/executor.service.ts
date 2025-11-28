import { BadRequestException } from '../../lib/errors.js'
import DbConnectionService from '../dbconnections/dbConnection.service.js'

import Execution from '../../models/queries/execution.model.js'

import * as helpFunctions from '../../lib/utils/functions.js'
import { Client } from 'pg'
import Executor from '../../models/executors/executor.model.js'

type QueryData = {
    sql: string
    explain?: boolean
}

const MAX_RETURNED_ROWS = 500

export default class ExecutorService {
    private dbConnectionService: DbConnectionService

    constructor() {
        this.dbConnectionService = new DbConnectionService()
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

    private async _ensureProjectOwned(projectId: number, userId: number) {
        await helpFunctions._ensureProjectOwned(projectId, userId)
    }

    private async _generateDefaultExecutorName(projectId: number): Promise<string> {
        let i = 1
        while (true) {
            const candidate = `Terminal ${i}`
            const exists = await Executor.findOne({
                where: { projectId, name: candidate },
            })
            if (!exists) return candidate
            i++
        }
    }

    private async _changePinned(projectId: number) {
        const executors: Executor[] = await Executor.findAll({
            where: { projectId }
        })

        for(const executor of executors) {
            if(executor.isPinned) {
                executor.isPinned = false
                executor.save()
            }
        }
    }

    private async _resolveExecutor(
        projectId: number,
        userId: number,
        executorId?: number,
        executorName?: string,
    ): Promise<Executor> {
        await this._ensureProjectOwned(projectId, userId)

        await this._changePinned(projectId)

        if (executorId) {
            const existing = await Executor.findOne({
                where: { id: executorId, projectId },
            })
            if (!existing) {
                throw new BadRequestException('Executor not found.')
            }
            existing.isPinned = true
            existing.save()
            return existing
        }

        const name = executorName?.trim() || (await this._generateDefaultExecutorName(projectId))

        await this._changePinned(projectId)

        const created = await Executor.create({
            projectId,
            name,
            isPinned: true
        } as any)

        return created
    }

    public async createExecutor(projectId: number, userId: number) {
        await this._ensureProjectOwned(projectId, userId)

        return await this._resolveExecutor(projectId, userId)
    }

    public async listExecutors(projectId: number, userId: number) {
        await this._ensureProjectOwned(projectId, userId)

        const executors = await Executor.findAll({
            where: { projectId },
            order: [['createdAt', 'ASC']],
        })

        return executors
    }

    public async renameExecutor(
        projectId: number,
        userId: number,
        executorId: number,
        name: string,
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const executor = await Executor.findOne({
            where: { id: executorId, projectId },
        })

        if (!executor) {
            throw new BadRequestException('Executor not found.')
        }

        executor.name = name.trim()
        await executor.save()
        return executor
    }

    public async deleteExecutor(
        projectId: number,
        userId: number,
        executorId: number
    ) {
        await this._ensureProjectOwned(projectId, userId)

        const executor = await Executor.findOne({
            where: { id: executorId, projectId }
        })

        if (!executor) {
            throw new BadRequestException('Executor not found.')
        }


        await executor.destroy()
    }

    public async executeQuery(
        projectId: number,
        userId: number,
        executorId: number,
        { sql, explain }: QueryData,
    ) {
        await this._ensureProjectOwned(projectId, userId)

        this._validateSelectOnly(sql)

        const dbConn = await this.dbConnectionService.getDbModel(projectId, userId)
        const connectionString = this.dbConnectionService.buildConnectionStringFromModel(dbConn)

        const executor = await this._resolveExecutor(
            projectId,
            userId,
            executorId
        )

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

            if (explain) {
                const explainSQL = `EXPLAIN (FORMAT JSON) ${sql.replace(
                    /;+\s*$/,
                    '',
                )}`
                const explainResp = await client.query(explainSQL)
                explained =
                    (explainResp.rows?.[0] &&
                        (explainResp.rows?.[0]['QUERY PLAN'] ??
                            explainResp.rows?.[0]['query_plan'])) ??
                    explainResp.rows ??
                    null
            }

            const resp = await client.query(sql)

            durationMs = Date.now() - started
            rowCount =
                typeof resp.rowCount === 'number'
                    ? resp.rowCount
                    : resp.rows?.length ?? null

            const rows = resp.rows ?? []
            fields =
                resp.fields?.map(f => ({
                    name: f.name,
                    dataTypeID: f.dataTypeID,
                    tableID: f.tableID,
                    columnID: f.columnID,
                })) ?? []

            if (rows.length > MAX_RETURNED_ROWS) {
                truncated = true
                returnedRows = rows.slice(0, MAX_RETURNED_ROWS)
            } else {
                returnedRows = rows
            }

            const execution = await Execution.create({
                projectId,
                connectionId: dbConn.id,
                executorId: executor.id,
                sql,
                rows: rowCount,
                durationMs,
                explained,
            } as any)

            return {
                executionId: execution.id,
                executorId: executor.id,
                executorName: executor.name,
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
            if (dbError.code)
                prettyMessageParts.push(`(error code: ${dbError.code})`)
            if (dbError.position)
                prettyMessageParts.push(`at position ${dbError.position}`)
            if (dbError.table)
                prettyMessageParts.push(`in table "${dbError.table}"`)

            const prettyMessage = `Query failed: ${prettyMessageParts.join(' ')}`

            throw new BadRequestException(prettyMessage)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }
}