import { 
    BadRequestException, 
    NotFoundException 
} from '../../lib/errors.js'

import DbConnection from '../../models/dbConnections/dbConnection.model.js'
import DbSchema from '../../models/dbConnections/dbSchema.model.js'

import { Client } from 'pg'
import mysql from 'mysql2/promise'
import crypto from 'crypto'
import * as helpFunctions from '../../lib/utils/functions.js'

import { 
    DbColumnSchema, 
    DbSchemaSnapshot, 
    DbTableSchema, 
    ParsedConnectionString, 
    SupportedDbType, 
    UpsertConnectionData 
} from '../../types/dbConnections/dbConnection.type.js'
import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'

export default class DbConnectionService {
    private _ensureSecretKey(): Buffer {
        const secret = process.env.USER_DB_PASSWORD_SECRET
        if(!secret) {
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
            cipher.final()
        ])
        const authTag = cipher.getAuthTag()

        return [
            iv.toString('base64'), 
            authTag.toString('base64'), 
            encrypted.toString('base64')
        ].join(':')
    }

    private _decryptPassword(stored: string): string {
        try {
            const [ivB64, tagB64, dataB64] = stored.split(':')
            if(!ivB64 || !tagB64 || !dataB64) {
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
                decipher.final()
            ])
            return decrypted.toString('utf8')
        } catch {
            throw new BadRequestException('Cannot decrypt database password. Please contact support.')
        }
    }

    private _isMySqlFamilly(dbType: SupportedDbType): boolean {
        return dbType === DbType.MYSQL || dbType === DbType.MARIADB
    }

    private _parseConnectionString(conn: string, dbType: SupportedDbType): ParsedConnectionString {
        let url: URL
        try {
            url = new URL(conn)
        } catch {
            throw new BadRequestException('Invalid connection string.')
        }

        if(dbType === DbType.POSTGRES) {
            if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
                throw new BadRequestException(
                    'Postgres connection string must have postgres:// or postgresql:// protocol.'
                )
            }
        } else if(this._isMySqlFamilly(dbType)) {
            if (!['mysql:', 'mariadb:'].includes(url.protocol)) {
                throw new BadRequestException('MySQL/MariaDB connection string must have mysql:// or mariadb:// protocol.')
            }
        }

        const username = url.username
        const password = url.password
        const host = url.hostname
        const database = url.pathname.replace(/^\//, '')
        const port = url.port && url.port.length > 0
                ? Number(url.port)
                : dbType === DbType.POSTGRES
                    ? 5432
                    : 3306

        if(!username || !password || !host || !database) {
            throw new BadRequestException(
                'Connection strings must contain: username, password, host name, database.'
            )
        }

        return { host, port, database, username, password }
    }

    private _getDbTypeFromModel(dbConn: DbConnection): SupportedDbType {
        return (dbConn as any).dbType ?? DbType.POSTGRES
    }

    private async _testPostgresConnection(connectionString: string) {
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

    private async _testMySqlFamilyConnection(connectionString: string) {
        let conn: mysql.Connection | undefined
        try {
            const started = Date.now()
            conn = await mysql.createConnection(connectionString)
            await conn.query('SELECT 1')
            return { latencyMs: Date.now() - started }
        } catch(err: any) {
            throw new BadRequestException(`Cannot connect to database, error: ${err.message || err}`)
        } finally {
            try {
                await conn?.end()
            } catch {}
        }
    }

    private async _testConnectionString(connectionString: string, dbType: SupportedDbType) {
        if(dbType === DbType.POSTGRES) {
            return this._testPostgresConnection(connectionString)
        }
        if(this._isMySqlFamilly(dbType)) {
            return this._testMySqlFamilyConnection(connectionString)
        }
        throw new BadRequestException('Unsupported database type.')
    }

    private async _loadPostgresSchemaSnapshot(connectionString: string): Promise<DbSchemaSnapshot> {
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
                    t.table_name
                FROM information_schema.tables t
                WHERE t.table_type = 'BASE TABLE'
                    AND t.table_schema = 'public'
                ORDER BY t.table_name;
            `)

            const columnsResp = await client.query(`
                SELECT
                    n.nspname AS table_schema,
                    c.relname AS table_name,
                    a.attname AS column_name,
                    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
                    NOT a.attnotnull AS is_nullable,
                    pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
                    ct.contype AS constraint_type,
                    ft.relname AS fk_table_name,
                    fa.attname AS fk_column_name
                FROM pg_attribute a
                JOIN pg_class c       ON c.oid = a.attrelid
                JOIN pg_namespace n   ON n.oid = c.relnamespace
                LEFT JOIN pg_attrdef ad
                    ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
                LEFT JOIN pg_constraint ct
                    ON ct.conrelid = a.attrelid AND a.attnum = ANY(ct.conkey)
                LEFT JOIN pg_class ft
                    ON ft.oid = ct.confrelid
                LEFT JOIN pg_attribute fa
                    ON fa.attrelid = ct.confrelid AND fa.attnum = ANY(ct.confkey)
                WHERE n.nspname = 'public'
                    AND c.relkind = 'r'
                    AND a.attnum > 0
                    AND NOT a.attisdropped
                ORDER BY c.relname, a.attnum;
            `)

            const tableMap = new Map<string, DbTableSchema>()

            for (const row of tablesResp.rows) {
                const key = `${row.table_schema}.${row.table_name}`

                tableMap.set(key, {
                    name: row.table_name,
                    schema: row.table_schema,
                    columns: [],
                })
            }

            for (const row of columnsResp.rows) {
                const key = `${row.table_schema}.${row.table_name}`
                const table = tableMap.get(key)
                if(!table) continue

                const col: DbColumnSchema = {
                    name: row.column_name,
                    dataType: row.data_type,
                    isNullable: !!row.is_nullable,
                    isPrimaryKey: row.constraint_type === 'p',
                    isForeignKey: row.constraint_type === 'f',
                    defaultValue: row.column_default ?? null,
                }

                if(row.constraint_type === 'f' && row.fk_table_name && row.fk_column_name) {
                    col.references = {
                        table: row.fk_table_name,
                        column: row.fk_column_name,
                    }
                }

                table.columns.push(col)
            }

            return { tables: Array.from(tableMap.values()) }
        } catch(err: any) {
            throw new BadRequestException(`Cannot load database schema, error: ${err.message || err}`)
        } finally {
            try {
                await client.end()
            } catch {}
        }
    }

    private async _loadMySqlFamilySnapshot(connectionString: string): Promise<DbSchemaSnapshot> {
        let conn: mysql.Connection | undefined

        try {
            conn = await mysql.createConnection(connectionString)

            const [tablesRows] = await conn.query<any[]>(`
                SELECT
                    TABLE_SCHEMA AS table_schema,
                    TABLE_NAME   AS table_name
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                    AND TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME;
            `)

            const [columnsRows] = await conn.query<any[]>(`
                SELECT
                    c.TABLE_SCHEMA AS table_schema,
                    c.TABLE_NAME AS table_name,
                    c.COLUMN_NAME AS column_name,
                    c.COLUMN_TYPE AS data_type,
                    (c.IS_NULLABLE = 'YES') AS is_nullable,
                    c.COLUMN_DEFAULT AS column_default,
                    c.COLUMN_KEY AS column_key,
                    kcu.REFERENCED_TABLE_NAME AS fk_table_name,
                    kcu.REFERENCED_COLUMN_NAME AS fk_column_name
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                    ON kcu.TABLE_SCHEMA = c.TABLE_SCHEMA
                    AND kcu.TABLE_NAME = c.TABLE_NAME
                    AND kcu.COLUMN_NAME = c.COLUMN_NAME
                    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
                WHERE c.TABLE_SCHEMA = DATABASE()
                ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
            `)

            const tableMap = new Map<string, DbTableSchema>()

            for (const row of tablesRows) {
                const key = `${row.table_schema}.${row.table_name}`

                tableMap.set(key, {
                    name: row.table_name,
                    schema: row.table_schema,
                    columns: [],
                })
            }

            for (const row of columnsRows) {
                const key = `${row.table_schema}.${row.table_name}`
                const table = tableMap.get(key)
                if(!table) continue

                const isPrimaryKey = row.column_key === 'PRI'
                const isForeignKey = !!row.fk_table_name

                const col: DbColumnSchema = {
                    name: row.column_name,
                    dataType: row.data_type,
                    isNullable: !!row.is_nullable,
                    isPrimaryKey,
                    isForeignKey,
                    defaultValue: row.column_default ?? null,
                }

                if(isForeignKey && row.fk_table_name && row.fk_column_name) {
                    col.references = {
                        table: row.fk_table_name,
                        column: row.fk_column_name,
                    }
                }

                table.columns.push(col)
            }

            return { tables: Array.from(tableMap.values()) }
        } catch (err: any) {
            throw new BadRequestException(`Cannot load database schema, error: ${err.message || err}`)
        } finally {
            try {
                await conn?.end()
            } catch {}
        }
    }

    private async _loadSchemaSnapshot(
        connectionString: string,
        dbType: SupportedDbType
    ): Promise<DbSchemaSnapshot> {
        if(dbType === DbType.POSTGRES) {
            return this._loadPostgresSchemaSnapshot(connectionString)
        }
        if(this._isMySqlFamilly(dbType)) {
            return this._loadMySqlFamilySnapshot(connectionString)
        }
        throw new BadRequestException('Unsupported database type.')
    }

    private async _upsertDbSchema(connectionId: number, snapshot: DbSchemaSnapshot) {
        const existing = await DbSchema.findOne({
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
            await DbSchema.create(payload as any)
        }
    }

    public getDbType(dbConn: DbConnection): SupportedDbType {
        return this._getDbTypeFromModel(dbConn)
    }

    public buildConnectionStringFromModel(dbConn: DbConnection): string {
        const dbType = this._getDbTypeFromModel(dbConn)
        const password = this._decryptPassword(dbConn.passwordEnc)

        const user = encodeURIComponent(dbConn.username)
        const pass = encodeURIComponent(password)
        const host = dbConn.host
        const port = dbConn.port || (dbType === DbType.POSTGRES ? 5432 : 3306)
        const db = dbConn.database

        let protocol: string
        if(dbType === DbType.POSTGRES) {
            protocol = 'postgres'
        } else if(dbType === DbType.MARIADB) {
            protocol = 'mariadb'
        } else{
            protocol = 'mysql'
        }
        return `${protocol}://${user}:${pass}@${host}:${port}/${db}`
    }

    public async getDbModel(projectId: number, userId: number): Promise<DbConnection> {
        const project = await helpFunctions._ensureProjectOwned(projectId, userId)

        const dbConn = await DbConnection.findOne({
            where: { projectId: project.id },
        })

        if(!dbConn) {
            throw new NotFoundException('Db Connection not configured yet for this project.')
        }

        return dbConn
    }

    public async upsertForProject(
        projectId: number,
        userId: number,
        { connectionString, dbType }: UpsertConnectionData
    ) {
        const project = await helpFunctions._ensureProjectOwned(projectId, userId)

        const parsed = this._parseConnectionString(connectionString, dbType)
        const testResult = await this._testConnectionString(connectionString, dbType)

        const existingDbConn = await DbConnection.findOne({
            where: { projectId: project.id },
        })

        const encryptedPassword = this._encryptPassword(parsed.password)

        const payload = {
            projectId: project.id,
            host: parsed.host,
            port: parsed.port,
            database: parsed.database,
            username: parsed.username,
            passwordEnc: encryptedPassword,
            readOnly: true,
            dbType,
        }

        let dbConn: DbConnection
        if(existingDbConn) {
            await existingDbConn.update(payload as any)
            dbConn = existingDbConn
        } else {
            dbConn = await DbConnection.create(payload as any)
        }

        const snapshot = await this._loadSchemaSnapshot(connectionString, dbType)
        await this._upsertDbSchema(dbConn.id, snapshot)

        if(!project.isActive) {
            project.isActive = true
            await project.save()
        }

        return {
            latencyMs: testResult?.latencyMs,
        }
    }

    public async getSchemaSnapshotForProject(
        projectId: number,
        userId: number
    ): Promise<DbSchemaSnapshot> {
        const dbConn = await this.getDbModel(projectId, userId)

        const schema = await DbSchema.findOne({
            where: { connectionId: dbConn.id },
        })

        if(!schema) {
            throw new NotFoundException('Database schema is not loaded for this project. Please refresh schema.')
        }

        return {
            tables: schema.tables,
        }
    }

    public async refreshSchemaForProject(projectId: number, userId: number) {
        const dbConn = await this.getDbModel(projectId, userId)
        const dbType = this._getDbTypeFromModel(dbConn)
        const connectionString = this.buildConnectionStringFromModel(dbConn)

        const snapshot = await this._loadSchemaSnapshot(connectionString, dbType)
        await this._upsertDbSchema(dbConn.id, snapshot)
    }

    public async testSavedConnection(projectId: number, userId: number) {
        const dbConn = await this.getDbModel(projectId, userId)
        const dbType = this._getDbTypeFromModel(dbConn)
        const connectionString = this.buildConnectionStringFromModel(dbConn)

        return this._testConnectionString(connectionString, dbType)
    }
}
