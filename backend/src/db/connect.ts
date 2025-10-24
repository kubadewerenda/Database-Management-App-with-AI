import { DbClient } from './client.js'
import { logger } from '../lib/logger.js'

export class DbConnect {
    private static _client: DbClient | null = null

    static async init() {
        const url = process.env.SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

        if (!url || !key) {
            logger.error('SUPABASE_URL or KEY not configured')
            throw new Error('Supabase not configured')
        }

        this._client = new DbClient({ url, key });
        logger.info('Supabase client created');

        const res = await fetch(`${url}/auth/v1/health`, {
            method: 'GET',
            headers: { apikey: key },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            logger.error(`Supabase health failed: HTTP ${res.status} ${text}`)
            throw new Error(`Supabase health check failed (${res.status})`)
        }

        logger.info('Supabase connection test OK')
    }

    static async connect() {
        return this.init()
    }

    static client() {
        if (!this._client) throw new Error('Supabase not initialized. Call DbConnect.init() first.')
        return this._client.supabase;
    }

    static close() {}
}
