import { BadRequestException } from '../../lib/errors.js'
import DbConnectionService from '../dbconnections/dbConnection.service.js'

import Execution from '../../models/queries/execution.model.js'

import * as helpFunctions from '../../lib/utils/functions.js'
import { Client } from 'pg'

type QueryData = {
    sql: string
    explain?: boolean
}

const MAX_RETURNED_ROWS = 500

export default class ExecutionQueryService {
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

    public async executeForProject(
        projectId: number,
        userId: number,
        { sql, explain }: QueryData
    ) {
        await helpFunctions._ensureProjectOwned(projectId, userId)

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