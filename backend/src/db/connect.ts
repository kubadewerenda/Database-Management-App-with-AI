import { DbClient } from './client.js'
import { logger } from '../lib/logger.js'

export class DbConnect {
    private static _client: DbClient | null = null

    static async init() {
        const url = process.env.DATABASE_URL
        const key = process.env.DATABASE_SERVICE_ROLE_KEY || process.env.DATABASE_ANON_KEY

        if (!url || !key) {
            logger.error('DATABASE_URL or KEY not configured')
            throw new Error('Database not configured')
        }

        this._client = new DbClient({ url, key });
        logger.info('Database client created');

        const res = await fetch(`${url}/auth/v1/health`, {
            method: 'GET',
            headers: { apikey: key },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            logger.error(`Database health failed: HTTP ${res.status} ${text}`)
            throw new Error(`Database health check failed (${res.status})`)
        }

        logger.info('Database connection test OK')
    }

    static async connect() {
        return this.init()
    }

    static client() {
        if (!this._client) throw new Error('Database not initialized. Call DbConnect.init() first.')
        return this._client.supabase;
    }

    static close() {}
}
