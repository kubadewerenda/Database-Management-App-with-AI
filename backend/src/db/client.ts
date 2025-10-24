import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class DbClient {
    public readonly supabase: SupabaseClient

    constructor({ url, key }: { url: string; key: string }) {
        this.supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        })
    }
}
