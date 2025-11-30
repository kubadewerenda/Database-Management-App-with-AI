export type ChatMessage = {
    role: 'user' | 'assistant' | 'system'
    content: string
    sqlDraft?: string | null
}

export type AiSqlResponse = {
    sql: string
    explanation: string
}

export type OpenAiMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}