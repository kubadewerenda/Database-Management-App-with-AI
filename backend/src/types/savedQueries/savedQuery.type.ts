export type SavedQueryPayload = {
    name: string
    description?: string | null
    sql: string
    tags?: string[]
}