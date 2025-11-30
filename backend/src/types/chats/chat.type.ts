export type SendMessageData = {
    message: string
}

export type ChatHistoryMessage = {
    id: number
    role: 'user' | 'assistant' | 'system'
    content: string
    sqlDraft: string | null
    createdAt: Date
}

export type ChatHistoryResult = {
    messages: ChatHistoryMessage[]
    nextCursor: number | null     
    hasMore: boolean
}