import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import Project from '../../models/projects/project.model.js'
import DbConnection from '../../models/projects/connection.model.js'
import SchemaCache from '../../models/projects/schemaCache.model.js'
import { Client } from 'pg'
import type { DbSchemaSnapshot, DbColumnSchema, DbTableSchema } from '../../types/schemaCache/schemaCache.js'

type UpsertConnectionData = {
    connectionString: string
    name?: string
    readOnly?: boolean
}

export default class DbConnectionService {
    private _parse_connection_string(conn: string) {
        let url: URL
        try {
            url = new URL(conn)
        } catch {
            throw new BadRequestException('Invalid connection string.')
        }

        if(!['postgres:', 'postgresql:'].includes(url.protocol)) {
            throw new BadRequestException('Connection string must have postgres:// or postgresql:// protocol.')
        }

        const username = url.username
        const password = url.password
        const host = url.hostname
        const port = url.port ? Number(url.port) : 5432
        const database = url.pathname.replace(/^\//, '')

        if(!username || !password || !host || !database) {
            throw new BadRequestException('Connection strings must contain: username, password, host name, database.')
        }

        return { host, port, database, username, password }
    }

    private async _test_connection_string(connectionString: string) {
        const client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            },
        })

        try {
            const started = Date.now()
            await client.connect()
            await client.query('SELECT 1')
            const ms = Date.now() - started
            return { ok: true, latencyMs: ms }
        } catch(err: any) {
            throw new BadRequestException(`Cannot connect to database, error: ${err.message || err}`)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _load_schema_snapshot(connectionString: string): Promise<DbSchemaSnapshot> {
        const client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            },
        })

        try {
            await client.connect()

            const tablesResp = await client.query(`
                SELECT
                    t.table_schema,
                    t.table_name,
                    obj_description(
                        (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
                    ) AS table_comment
                FROM information_schema.tables t
                WHERE t.table_type = 'BASE TABLE'
                    AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY t.table_schema, t.table_name;
            `)

            const columnsResp = await client.query(`
                SELECT
                    c.table_schema,
                    c.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable = 'YES' AS is_nullable,
                    c.column_default,
                    tc.constraint_type,
                    fk_tab.table_name AS fk_table_name,
                    fk_col.column_name AS fk_column_name
                FROM information_schema.columns c
                LEFT JOIN information_schema.key_column_usage kcu
                    ON kcu.table_schema = c.table_schema
                    AND kcu.table_name = c.table_name
                    AND kcu.column_name = c.column_name
                LEFT JOIN information_schema.table_constraints tc
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                    AND tc.table_name = kcu.table_name
                LEFT JOIN information_schema.referential_constraints rc
                    ON rc.constraint_name = kcu.constraint_name
                LEFT JOIN information_schema.key_column_usage fk_col
                    ON fk_col.constraint_name = rc.unique_constraint_name
                    AND fk_col.ordinal_position = kcu.position_in_unique_constraint
                LEFT JOIN information_schema.tables fk_tab
                    ON fk_tab.table_schema = fk_col.table_schema
                    AND fk_tab.table_name = fk_col.table_name
                WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY c.table_schema, c.table_name, c.ordinal_position;
            `)

            const tableMap = new Map<string, DbTableSchema>()

            for(const row of tablesResp.rows) {
                const key = `${row.table_schema}.${row.table_name}`

                tableMap.set(key, {
                    name: row.table_name,
                    schema: row.table_schema,
                    columns: [],
                    comment: row.table_comment ?? null
                })
            }

            for(const row of columnsResp.rows) {
                const key = `${row.table_schema}.${row.table_name}`
                const table = tableMap.get(key)
                if(!table) continue

                const col: DbColumnSchema = {
                    name: row.column_name,
                    dataType: row.data_type,
                    isNullable: !!row.is_nullable,
                    isPrimaryKey: row.constraint_type === 'PRIMARY KEY',
                    isForeignKey: row.constraint_type === 'FOREIGN KEY',
                    defaultValue: row.column_default ?? null,
                }

                if(row.constraint_type === 'FOREIGN KEY' && row.fk_table_name && row.fk_column_name) {
                    col.references = {
                        table: row.fk_table_name,
                        column: row.fk_column_name,
                    }
                }

                table.columns.push(col)
            }

            const tables = Array.from(tableMap.values())
            return { tables }
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _upsert_schema_cache(connectionId: number, snapshot: DbSchemaSnapshot) {
        const existing = await SchemaCache.findOne({
            where: { connectionId },
        })

        const payload = {
            connectionId,
            refreshedAt: new Date(),
            tables: snapshot.tables,
        }

        if(existing) {
            await existing.update(payload as any)
        } else {
            await SchemaCache.create(payload as any)
        }
    }

    public build_connection_string_from_model(dbConn: DbConnection): string {
        // TODO: dodac hash passworda
        const password = dbConn.passwordEnc

        const user = encodeURIComponent(dbConn.username)
        const pass = encodeURIComponent(password)
        const host = dbConn.host
        const port = dbConn.port || 5432
        const db = dbConn.database

        return `postgres://${user}:${pass}@${host}:${port}/${db}`
    }

    public async get_db_model(projectId: number, userId: number): Promise<DbConnection> {
        if(!userId || !projectId) {
            throw new BadRequestException('Project and user are required.')
        }

        const project = await Project.findOne({
            where: {id: projectId, ownerId: userId}
        })

        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        const dbConn = await DbConnection.findOne({
            where: {projectId: project.id}
        })

        if(!dbConn) {
            throw new NotFoundException('Db Connection not configured yet for this project.')
        }

        return dbConn
    }

    public async upsert_for_project(
        projectId: number,
        userId: number,
        { connectionString, name, readOnly }: UpsertConnectionData
    ) {
        if(!projectId || !userId) {
            throw new BadRequestException('Project and user are required.')
        }

        const project = await Project.findOne({
            where: {id: projectId, ownerId: userId}
        })

        if(!project) {
            throw new NotFoundException('Project not found.')
        }

        const connectionStringParsed = this._parse_connection_string(connectionString)

        const testResult = await this._test_connection_string(connectionString)

        const existingDbConn = await DbConnection.findOne({
            where: { projectId: project.id }
        })

        const payload = {
            projectId: project.id,
            name: name || 'Main connection',
            host: connectionStringParsed.host,
            port: connectionStringParsed.port,
            database: connectionStringParsed.database,
            username: connectionStringParsed.username,
            // TODO: zaszyfrowac haslo
            passwordEnc: connectionStringParsed.password,
            readOnly: readOnly ?? true,
        }

        let dbConn: DbConnection

        if(existingDbConn) {
            await existingDbConn.update(payload)
            dbConn = existingDbConn
        } else {
            dbConn = await DbConnection.create(payload as any)
        }

        const snapshot = await this._load_schema_snapshot(connectionString)
        await this._upsert_schema_cache(dbConn.id, snapshot)

        return {
            ok: true,
            latencyMs: testResult.latencyMs
        }
    }

    public async get_schema_snapshot_for_project(
        projectId: number,
        userId: number
    ): Promise<DbSchemaSnapshot> {
        const dbConn = await this.get_db_model(projectId, userId)

        const schema = await SchemaCache.findOne({
            where: { connectionId: dbConn.id }
        })

        if (!schema) {
            throw new NotFoundException(
                'Database schema is not loaded for this project. Please refresh schema.'
            )
        }

        return {
            tables: schema.tables
        }
    }

    public async refresh_schema_for_project(projectId: number, userId: number) {
        const dbConn = await this.get_db_model(projectId, userId)
        const connectionString = this.build_connection_string_from_model(dbConn)

        const snapshot = await this._load_schema_snapshot(connectionString)
        await this._upsert_schema_cache(dbConn.id, snapshot)

        return {
            ok: true,
            refreshedAt: new Date()
        }
    }

    public async test_saved_connection(projectId: number, userId: number) {
        const dbConn = await this.get_db_model(projectId, userId)
        const connectionString = this.build_connection_string_from_model(dbConn)

        return await this._test_connection_string(connectionString)
    }
}