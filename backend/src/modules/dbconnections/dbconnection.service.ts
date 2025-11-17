import { BadRequestException, NotFoundException } from '../../lib/errors.js'
import Project from '../../models/projects/project.model.js'
import DbConnection from '../../models/projects/connection.model.js'
import { Client } from 'pg'

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

        if(existingDbConn) {
            await existingDbConn.update(payload)
        } else {
            await DbConnection.create(payload as any)
        }

        // TODO: Dodac schemat itp itd

        return {
            ok: true,
            latencyMs: testResult.latencyMs
        }
    }

    public async test_saved_connection(projectId: number, userId: number) {
        const dbConn = await this.get_db_model(projectId, userId)
        const connectionString = this.build_connection_string_from_model(dbConn)

        return await this._test_connection_string(connectionString)
    }
}