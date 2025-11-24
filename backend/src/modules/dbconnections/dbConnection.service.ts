import crypto from 'crypto'
import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import DbConnection from '../../models/projects/connection.model.js'
import SchemaCache from '../../models/projects/schemaCache.model.js'
import { Client } from 'pg'
import type { DbSchemaSnapshot, DbColumnSchema, DbTableSchema } from '../../types/schemaCache/schemaCache.js'
import * as helpFunctions from '../../lib/utils/functions.js'

type UpsertConnectionData = {
    connectionString: string
}

export default class DbConnectionService {
    private _ensureSecretKey(): Buffer {
        const secret = process.env.USER_DB_PASSWORD_SECRET
        if (!secret) {
            throw new Error('USER_DB_PASSWORD_SECRET not set.')
        }

        return crypto.createHash('sha256').update(secret).digest()
    }

    private _encryptPassword(plain: string): string {
        const key = this._ensureSecretKey()
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

        const encrypted = Buffer.concat([
            cipher.update(plain, 'utf8'),
            cipher.final(),
        ])
        const authTag = cipher.getAuthTag()

        return [
            iv.toString('base64'),
            authTag.toString('base64'),
            encrypted.toString('base64'),
        ].join(':')
    }

    private _decryptPassword(stored: string): string {
        try {
            const [ivB64, tagB64, dataB64] = stored.split(':')
            if (!ivB64 || !tagB64 || !dataB64) {
                throw new Error('Invalid encrypted payload format.')
            }

            const key = this._ensureSecretKey()
            const iv = Buffer.from(ivB64, 'base64')
            const authTag = Buffer.from(tagB64, 'base64')
            const encrypted = Buffer.from(dataB64, 'base64')

            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
            decipher.setAuthTag(authTag)

            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final(),
            ])

            return decrypted.toString('utf8')
        } catch (err: any) {
            throw new BadRequestException(
                'Cannot decrypt database password. Please contact support.'
            )
        }
    }

    private _parseConnectionString(conn: string) {
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

    private async _testConnectionString(connectionString: string) {
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
            return { latencyMs: Date.now() - started }
        } catch(err: any) {
            throw new BadRequestException(`Cannot connect to database, error: ${err.message || err}`)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _loadSchemaSnapshot(connectionString: string): Promise<DbSchemaSnapshot> {
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
        } catch(err: any) {
            throw new BadRequestException(`Cannot load database schema, error: ${err.message || err}`)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _upsertSchemaCache(connectionId: number, snapshot: DbSchemaSnapshot) {
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

    public buildConnectionStringFromModel(dbConn: DbConnection): string {
        const password = this._decryptPassword(dbConn.passwordEnc)

        const user = encodeURIComponent(dbConn.username)
        const pass = encodeURIComponent(password)
        const host = dbConn.host
        const port = dbConn.port || 5432
        const db = dbConn.database

        return `postgres://${user}:${pass}@${host}:${port}/${db}`
    }

    public async getDbModel(projectId: number, userId: number): Promise<DbConnection> {
        const project = await helpFunctions._ensureProjectOwned(projectId, userId)

        const dbConn = await DbConnection.findOne({
            where: {projectId: project.id}
        })

        if(!dbConn) {
            throw new NotFoundException('Db Connection not configured yet for this project.')
        }

        return dbConn
    }

    public async upsertForProject(
        projectId: number,
        userId: number,
        { connectionString }: UpsertConnectionData
    ) {
        const project = await helpFunctions._ensureProjectOwned(projectId, userId)

        const connectionStringParsed = this._parseConnectionString(connectionString)

        const testResult = await this._testConnectionString(connectionString)

        const existingDbConn = await DbConnection.findOne({
            where: { projectId: project.id }
        })

        const encryptedPassword = this._encryptPassword(
            connectionStringParsed.password
        )

        const payload = {
            projectId: project.id,
            host: connectionStringParsed.host,
            port: connectionStringParsed.port,
            database: connectionStringParsed.database,
            username: connectionStringParsed.username,
            passwordEnc: encryptedPassword,
            readOnly: true,
        }

        let dbConn: DbConnection

        if(existingDbConn) {
            await existingDbConn.update(payload)
            dbConn = existingDbConn
        } else {
            dbConn = await DbConnection.create(payload as any)
        }

        const snapshot = await this._loadSchemaSnapshot(connectionString)
        await this._upsertSchemaCache(dbConn.id, snapshot)

        if(!project.isActive) {
            project.isActive = true
            await project.save()
        }

        return {
            latencyMs: testResult.latencyMs
        }
    }

    public async getSchemaSnapshotForProject(
        projectId: number,
        userId: number
    ): Promise<DbSchemaSnapshot> {
        const dbConn = await this.getDbModel(projectId, userId)

        const schema = await SchemaCache.findOne({
            where: { connectionId: dbConn.id }
        })

        if(!schema) {
            throw new NotFoundException(
                'Database schema is not loaded for this project. Please refresh schema.'
            )
        }

        return {
            tables: schema.tables
        }
    }

    public async refreshSchemaForProject(projectId: number, userId: number) {
        const dbConn = await this.getDbModel(projectId, userId)
        const connectionString = this.buildConnectionStringFromModel(dbConn)

        const snapshot = await this._loadSchemaSnapshot(connectionString)
        await this._upsertSchemaCache(dbConn.id, snapshot)
    }

    public async testSavedConnection(projectId: number, userId: number) {
        const dbConn = await this.getDbModel(projectId, userId)
        const connectionString = this.buildConnectionStringFromModel(dbConn)

        return await this._testConnectionString(connectionString)
    }
}
