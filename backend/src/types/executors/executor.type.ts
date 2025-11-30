import { DbType } from '../../enums/dbConnection/dbConnection.enum'
import { ExportFormat } from '../../enums/executors/executor.enum'

export type QueryData = {
    sql: string
    maxReturnedRows?: number,
    explain?: boolean
}

export type ExecutionCoreResult = {
    rows: any[]
    fields: { name: string; [key: string]: any }[]
    rowCount: number | null
    durationMs: number | null
    truncated: boolean
    explained: unknown | null
}

export type ExportExecutionResultJson = {
    format: ExportFormat.JSON
    filename: string
    mimetype: 'application/json'
    content: string
}

export type ExportExecutionResultCsv = {
    format: ExportFormat.CSV
    filename: string
    mimetype: 'text/csv'
    content: string
}

export type ExportExecutionResult = ExportExecutionResultJson | ExportExecutionResultCsv

export type DbExecutionEnv = {
    dbConn: any
    dbType: DbType
    connectionString: string
}

export type SupportedExportFormat = ExportFormat.JSON | ExportFormat.CSV