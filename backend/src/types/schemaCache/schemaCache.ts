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