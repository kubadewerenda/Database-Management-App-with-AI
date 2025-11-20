export type AiChatMessage = {
    role: 'user' | 'assistant' | 'system'
    content: string
    sqlDraft?: string | null
}

export type AiSqlResponse = {
    sql: string
    explanation: string
}
