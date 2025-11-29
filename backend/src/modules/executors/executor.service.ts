import { BadRequestException } from '../../lib/errors.js'

import DbConnectionService from '../dbconnections/dbConnection.service.js'

import Execution from '../../models/queries/execution.model.js'
import Executor from '../../models/executors/executor.model.js'

import * as helpFunctions from '../../lib/utils/functions.js'
import { Client } from 'pg'
import mysql from 'mysql2/promise'

import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'
import { ExportFormat } from '../../enums/Executors/executor.enum.js'
import { 
    DbExecutionEnv, 
    ExecutionCoreResult, 
    ExportExecutionResult, 
    QueryData, 
    SupportedExportFormat 
} from '../../types/executors/executor.type.js'

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

    private async _unsetPinnedForProject(projectId: number) {
        const executors: Executor[] = await Executor.findAll({
            where: { projectId, isPinned: true }
        })

        if(!executors.length) return

        for(const executor of executors) {
            executor.isPinned = false
            await executor.save()
        }
    }

    private async _resolveExecutor(
        projectId: number,
        userId: number,
        executorId?: number
    ): Promise<Executor> {
        await this._ensureProjectOwned(projectId, userId)

        await this._unsetPinnedForProject(projectId)

        if (executorId) {
            const existing = await Executor.findOne({
                where: { id: executorId, projectId },
            })

            if (!existing) {
                throw new BadRequestException('Executor not found.')
            }

            existing.isPinned = true
            await existing.save()
            return existing
        }

        const name = await this._generateDefaultExecutorName(projectId)

        const created = await Executor.create({
            projectId,
            name,
            isPinned: true
        } as any)

        return created
    }

    private _stripTrailingSemicolons(sql: string): string {
        return sql.trim().replace(/;+\s*$/, '')
    }

    private async _getDbExecutionEnv(projectId: number, userId: number): Promise<DbExecutionEnv> {
        const dbConn = await this.dbConnectionService.getDbModel(projectId, userId)
        const dbType = this.dbConnectionService.getDbType(dbConn)
        const connectionString = this.dbConnectionService.buildConnectionStringFromModel(dbConn)

        return { dbConn, dbType, connectionString }
    }

    private async _executeByDbType(
        dbType: DbType,
        connectionString: string,
        sql: string,
        explain: boolean | undefined,
        maxReturnedRows: number,
    ): Promise<ExecutionCoreResult> {
        if(dbType === DbType.POSTGRES) {
            return await this._executeOnPostgres(connectionString, sql, explain, maxReturnedRows)
        } else if(dbType === DbType.MARIADB) {
            return await this._executeOnMySqlFamily(connectionString, sql, explain, maxReturnedRows)
        } else if(dbType === DbType.MYSQL) {
            return await this._executeOnMySqlFamily(connectionString, sql, explain, maxReturnedRows)
        } else {
            throw new BadRequestException('Unsupported database type for execution.')
        }
    }

    private _rowsToCsv(rows: any[], fields: { name: string }[]): string {
        if (!fields || fields.length === 0) return ''

        const escape = (val: any): string => {
            if (val === null || val === undefined) return ''

            if (val instanceof Date) {
                return `"${val.toISOString()}"`
            }

            let str = String(val)
            str = str.replace(/"/g, '""')
            return `"${str}"`
        }

        const header = fields.map(f => `"${f.name}"`).join(',')

        const lines = rows.map(row =>
            fields.map(f => escape(row[f.name])).join(','),
        )

        return [header, ...lines].join('\n')
    }

    private _buildExportResult(
        format: SupportedExportFormat,
        executionId: number,
        sql: string,
        core: ExecutionCoreResult,
    ): ExportExecutionResult {
        if(format === ExportFormat.JSON) {
            const payload = {
                executionId,
                sql,
                rowCount: core.rowCount,
                durationMs: core.durationMs,
                rows: core.rows,
            }

            return {
                format: ExportFormat.JSON,
                filename: `execution-${executionId}.json`,
                mimetype: 'application/json',
                content: JSON.stringify(payload, null, 2),
            }
        }

        if(format === ExportFormat.CSV) {
            const csvString = this._rowsToCsv(core.rows, core.fields)

            return {
                format: ExportFormat.CSV,
                filename: `execution-${executionId}.csv`,
                mimetype: 'text/csv',
                content: csvString,
            }
        }
        throw new BadRequestException('Unsupported export format type.')
    }

    private async _executeOnPostgres(
        connectionString: string,
        sql: string,
        explain: boolean | undefined,
        maxReturnedRows: number,
    ): Promise<ExecutionCoreResult> {
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
                const sqlWithoutSemis = this._stripTrailingSemicolons(sql)
                const explainSQL = `EXPLAIN (FORMAT JSON) ${sqlWithoutSemis}`
                const explainResp = await client.query(explainSQL)

                explained = (explainResp.rows?.[0] 
                        && (explainResp.rows?.[0]['QUERY PLAN'] 
                            ?? explainResp.rows?.[0]['query_plan'])) 
                        ?? explainResp.rows 
                        ?? null
            }

            const resp = await client.query(sql)

            durationMs = Date.now() - started
            rowCount = typeof resp.rowCount === 'number'
                    ? resp.rowCount
                    : resp.rows?.length ?? null

            const rows = resp.rows ?? []
            fields = resp.fields?.map(f => ({
                    name: f.name,
                    dataTypeID: f.dataTypeID,
                    tableID: f.tableID,
                    columnID: f.columnID,
                })) ?? []

            if(rows.length > maxReturnedRows) {
                truncated = true
                returnedRows = rows.slice(0, maxReturnedRows)
            } else {
                returnedRows = rows
            }

            return {
                rows: returnedRows,
                fields,
                rowCount,
                durationMs,
                truncated,
                explained,
            }
        } catch(err: any) {
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

            const prettyMessageParts: string[] = []

            if(dbError.message) prettyMessageParts.push(dbError.message)
            if(dbError.code)
                prettyMessageParts.push(`(error code: ${dbError.code})`)
            if(dbError.position)
                prettyMessageParts.push(`at position ${dbError.position}`)
            if(dbError.table)
                prettyMessageParts.push(`in table "${dbError.table}"`)

            const prettyMessage = `Query failed: ${prettyMessageParts.join(' ')}`

            throw new BadRequestException(prettyMessage)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _executeOnMySqlFamily(
        connectionString: string,
        sql: string,
        explain: boolean | undefined,
        maxReturnedRows: number
    ): Promise<ExecutionCoreResult> {
        let conn: mysql.Connection | undefined

        let explained: unknown | null = null
        let rowCount: number | null = null
        let durationMs: number | null = null
        let returnedRows: any[] = []
        let fields: any[] = []
        let truncated = false

        const started = Date.now()

        try {
            conn = await mysql.createConnection(connectionString)

            if(explain) {
                const sqlWithoutSemis = this._stripTrailingSemicolons(sql)
                const [explainRows] = await conn.query<any[]>(
                    `EXPLAIN ${sqlWithoutSemis}`,
                )
                explained = explainRows
            }

            const [rows, meta] = await conn.query<any[] & { length: number }>(
                sql,
            )

            durationMs = Date.now() - started
            rowCount = Array.isArray(rows) ? rows.length : null

            if(Array.isArray(rows)) {
                if(rows.length > maxReturnedRows) {
                    truncated = true
                    returnedRows = rows.slice(0, maxReturnedRows)
                } else {
                    returnedRows = rows
                }
            } else {
                returnedRows = []
            }

            if(Array.isArray(meta)) {
                fields = meta.map((f: any) => ({
                    name: f.name,
                    orgName: f.orgName,
                    table: f.table,
                    orgTable: f.orgTable,
                    columnType: f.columnType,
                }))
            }

            return {
                rows: returnedRows,
                fields,
                rowCount,
                durationMs,
                truncated,
                explained,
            }
        } catch(err: any) {
            const dbError = {
                message: err.sqlMessage || err.message,
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
            }

            const parts: string[] = []
            if(dbError.message) parts.push(dbError.message)
            if(dbError.code) parts.push(`(code: ${dbError.code})`)
            if(dbError.sqlState) parts.push(`(state: ${dbError.sqlState})`)

            const prettyMessage = `Query failed: ${parts.join(' ')}`

            throw new BadRequestException(prettyMessage)
        } finally {
            try {
                await conn?.end()
            } catch {}
        }
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
        { sql, explain, maxReturnedRows }: QueryData,
    ) {
        await this._ensureProjectOwned(projectId, userId)

        this._validateSelectOnly(sql)

        const { dbConn, dbType, connectionString } = await this._getDbExecutionEnv(projectId, userId)

        const executor = await this._resolveExecutor(
            projectId,
            userId,
            executorId,
        )

        const effectiveMax = maxReturnedRows && maxReturnedRows > 0
            ? Math.min(maxReturnedRows, 1000)
            : MAX_RETURNED_ROWS

        const core = await this._executeByDbType(
            dbType,
            connectionString,
            sql,
            explain,
            effectiveMax,
        )

        

        const execution = await Execution.create({
            projectId,
            connectionId: dbConn.id,
            executorId: executor.id,
            sql,
            rows: core.rowCount,
            durationMs: core.durationMs,
            explained: core.explained,
        } as any)

        return {
            executionId: execution.id,
            executorId: executor.id,
            executorName: executor.name,
            rows: core.rows,
            fields: core.fields,
            rowCount: core.rowCount,
            durationMs: core.durationMs,
            truncated: core.truncated,
            explain: core.explained,
        }
    }

    public async exportExecution(
        projectId: number,
        userId: number,
        executorId: number,
        executionId: number,
        format: SupportedExportFormat,
    ): Promise<ExportExecutionResult> {
        await this._ensureProjectOwned(projectId, userId)

        const { dbType, connectionString } = await this._getDbExecutionEnv(projectId, userId)

        const execution = await Execution.findOne({
            where: { id: executionId, projectId, executorId },
        })

        if(!execution) {
            throw new BadRequestException('Execution not found.')
        }

        const sql = execution.sql

        const core = await this._executeByDbType(
            dbType,
            connectionString,
            sql,
            false,
            MAX_RETURNED_ROWS
        )

        return this._buildExportResult(format, executionId, sql, core)
    }
}