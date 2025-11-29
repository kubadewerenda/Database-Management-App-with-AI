import OpenAI from 'openai'
import { ChatMessage, AiSqlResponse, OpenAiMessage } from '../../types/ai/aiProvider.js'
import { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'
import { BadRequestException } from '../../lib/errors.js'

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

export default class AiProviderService {
    private client: OpenAI

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY
        if(!apiKey) {
            throw new BadRequestException('OPENAI_API_KEY is not set in environment variables.')
        }

        this.client = new OpenAI({ apiKey })
    }

    private _buildSchemaSummary(schema: DbSchemaSnapshot): string {
        const lines: string[] = []

        for (const table of schema.tables) {
            const cols = table.columns
                .map(c => {
                    const flags: string[] = []
                    if(c.isPrimaryKey) flags.push('PK')
                    if(c.isForeignKey) flags.push('FK')
                    if(!c.isNullable) flags.push('NOT NULL')

                    const flagsStr = flags.length ? ` (${flags.join(', ')})` : ''

                    const refStr = c.references
                        ? ` -> REFERENCES ${table.schema}.${c.references.table}(${c.references.column})`
                        : ''

                    return `- ${c.name}: ${c.dataType}${flagsStr}${refStr}`
                })
                .join('\n')

            lines.push(
                `TABLE ${table.schema}.${table.name}:\n${cols}`,
            )
        }

        return lines.join('\n\n')
    }

    private _mapHistoryToOpenAiMessages(history: ChatMessage[]): OpenAiMessage[] {
        return history
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))
    }

    private _buildSystemPrompt(): string {
        return `
            You are an assistant that helps the user work **only** with their project's relational SQL database.
            The underlying engine may be PostgreSQL, MySQL or MariaDB, but you always write ANSI-compatible SQL
            that works on these engines (and avoid engine-specific features unless the user explicitly asks).

            CRITICAL RULES (you MUST respect all of them):

            1. SCOPE:
            - You ONLY talk about this project's database schema, data modelling and SQL queries.
            - If the user asks about anything outside databases/SQL (life, random programming, etc.),
                you MUST NOT answer the question.
            - In those cases you MUST return:
                "sql": ""
                "explanation": short message saying you only support database/SQL questions for this project.
            - Simple greetings like "hi", "siema", "thanks", etc. are allowed, but your response still
                must explain that you are a database/SQL assistant.

            2. CONVERSATION / MEMORY:
            - Always treat previous messages as context.
            - The user may refine or modify a previous query ("add filter", "sort by date", "join with users" etc.).
            - You MUST read the conversation history and keep the logic consistent. Do not "forget" previous steps.
            - If the user refers to "the previous query" or "that last one", they mean the last SQL you returned.

            3. SQL OUTPUT:
            - You ALWAYS return exactly ONE SQL statement which is a safe SELECT or SELECT with WITH CTE.
            - NO INSERT, UPDATE, DELETE, TRUNCATE, DROP, ALTER or any DDL/DML that changes data or schema.
            - The query MUST be syntactically valid and executable as-is.
            - No placeholders like <table>, <column>, no comments, no "...".
            - Do not use tables or columns that are not present in the provided schema.
            - If you are not sure which table/column to use, re-read the schema and make the best precise choice.
                If it is really impossible, return an empty "sql" and explain the limitation in "explanation".

            4. SCHEMA RESPECT:
            - Use ONLY tables and columns present in the schema snapshot.
            - Respect primary keys, foreign keys and NOT NULL when writing joins and conditions.
            - Prefer explicit JOINs with ON conditions using foreign key relations when relevant.

            5. RESPONSE FORMAT (VERY IMPORTANT):
            - You MUST return your answer STRICTLY as JSON with this shape:

                {
                "sql": "SELECT ...",
                "explanation": "Human-readable explanation of what this query does, in the same language as the user."
                }

            - No extra fields. No backticks. No Markdown. No natural language outside the JSON object.
        `.trim()
    }

    private _buildSchemaPrompt(schemaSummary: string): string {
        return `
            Database schema snapshot (unified view from PostgreSQL/MySQL/MariaDB):

            ${schemaSummary}

            Remember:
            - Use ONLY the tables and columns listed above.
            - Prefer meaningful column names in SELECT (not SELECT *) unless the user explicitly wants all columns.
            - When joining tables, base your joins on the primary/foreign key relationships shown above.
        `.trim()
    }

    private _buildUserPrompt(userMessage: string): string {
        return `
            User request:

            ${userMessage}

            Generate a single safe SELECT query (or SELECT with WITH CTE) that best answers this request,
            using ONLY the provided database schema.

            If the request cannot be answered with the given schema, set "sql" to an empty string ""
            and use "explanation" to clearly describe why it is not possible and what would be needed.
        `.trim()
    }

    private _parseAndValidateAiResponse(raw: string): AiSqlResponse {
        const trimmed = raw.trim()
        if(!trimmed) {
            throw new Error('Empty response from AI')
        }

        let parsed: any

        try {
            parsed = JSON.parse(trimmed)
        } catch {
            const match = trimmed.match(/\{[\s\S]*\}/)
            if(!match) {
                throw new Error(`Unable to parse AI response as JSON: ${trimmed}`)
            }
            parsed = JSON.parse(match[0])
        }

        if(typeof parsed !== 'object' || parsed === null 
            || typeof parsed.sql !== 'string' || typeof parsed.explanation !== 'string'
        ) {
            throw new Error('AI response JSON does not contain valid "sql" (string) and "explanation" (string) fields.')
        }

        const sql = parsed.sql.trim()
        const explanation = parsed.explanation.trim()

        if(sql.length > 0) {
            const lower = sql.toLowerCase()

            if (!lower.startsWith('select') && !lower.startsWith('with')) {
                throw new Error('Generated SQL is not a SELECT/CTE query.')
            }

            const withoutTrailingSemis = sql.replace(/;+\s*$/, '')
            if (withoutTrailingSemis.includes(';')) {
                throw new Error(
                    'Generated SQL appears to contain multiple statements.',
                )
            }
        }

        return { sql, explanation }
    }

    public async generateSQLFromNeutralLanguage(params: {
        schema: DbSchemaSnapshot
        messages: ChatMessage[]
        userMessage: string
    }): Promise<AiSqlResponse> {

        const { schema, messages, userMessage } = params

        const schemaSummary = this._buildSchemaSummary(schema)
        const historyMessages = this._mapHistoryToOpenAiMessages(messages)

        const systemPrompt = this._buildSystemPrompt()
        const schemaPrompt = this._buildSchemaPrompt(schemaSummary)
        const userPrompt = this._buildSchemaPrompt(userMessage)

        try {
            const completion = await this.client.chat.completions.create({
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'system', content: schemaPrompt },
                    ...historyMessages,
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.15,
                response_format: { type: 'json_object' } as any,
            })

            const raw = completion.choices[0]?.message?.content
            if(!raw) {
                throw new Error('Empty response from AI')
            }

            const result = this._parseAndValidateAiResponse(raw)
            return result
        } catch(err: any) {
            throw new BadRequestException(`AI failed to generate SQL: ${err.message || String(err)}`)
        } 
    }
}