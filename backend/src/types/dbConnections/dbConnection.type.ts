import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'

export type SupportedDbType = DbType.POSTGRES | DbType.MYSQL | DbType.MARIADB

export type UpsertConnectionData = {
    connectionString: string
    dbType: SupportedDbType
}

export type ParsedConnectionString = {
    host: string
    port: number
    database: string
    username: string
    password: string
}

export interface DbColumnSchema {
    name: string
    dataType: string
    isNullable: boolean
    isPrimaryKey: boolean
    isForeignKey: boolean
    defaultValue?: string | null
    references?: {
        table: string
        column: string
    }
}

export interface DbTableSchema {
    name: string      
    schema: string        
    columns: DbColumnSchema[]
    comment?: string | null
}

export interface DbSchemaSnapshot {
    tables: DbTableSchema[]
}