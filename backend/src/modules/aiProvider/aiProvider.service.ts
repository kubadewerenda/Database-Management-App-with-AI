import OpenAI from 'openai'
import { ChatMessage, AiSqlResponse, OpenAiMessage } from '../../types/ai/aiProvider.js'
import { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'
import { BadRequestException } from '../../lib/errors.js'
import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'
import DbConnectionService from '../dbconnections/dbConnection.service.js'

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

    private _buildSystemPrompt(dbType: DbType): string {
        return `
            You are an assistant that helps the user work **only** with their project's relational SQL database.
            The database engine for THIS project is: ${dbType}.
            You MUST assume that all queries you generate will be executed on ${dbType}.

            The underlying engine may be PostgreSQL, MySQL or MariaDB in general, but for this project it is
            concretely ${dbType}. You can use features that are safe and commonly supported by ${dbType}.

            CRITICAL RULES (you MUST respect all of them):

            1. SCOPE:
                - You ONLY talk about this project's database schema, data modelling and SQL queries.
                - If the user asks about anything outside databases/SQL (life, random programming, etc.),
                    you MUST NOT answer the question.
                - In those cases you MUST return:
                    "sql": ""
                    "explanation": a short message saying you only support database/SQL questions for this project.
                - Simple greetings like "hi", "hello", "siema", "cześć", "thanks", etc. are allowed,
                    but they are treated as **no database question**. For such messages you MUST NOT invent any SQL query
                    and you MUST return:
                    "sql": ""
                    "explanation": a short greeting + information that you are a database/SQL assistant and
                                    the user should ask a question related to the database.

            2. CONVERSATION / MEMORY:
                - Always treat previous messages as context.
                - The user may refine or modify a previous query ("add a filter", "sort by date", "join with users", etc.).
                - You MUST read the conversation history and keep the logic consistent. Do not "forget" previous steps.
                - If the user refers to "the previous query" or "that last one", they mean the last SQL you returned.

            3. SQL OUTPUT:
                - You ONLY generate a SQL query if the **current user message contains a clear database/SQL-related request**,
                    such as: asking for data from tables, filtering, sorting, grouping, joining, aggregation, etc.
                - You ALWAYS return exactly ONE SQL statement which is a safe SELECT, or a WITH ... SELECT query.
                - NO INSERT, UPDATE, DELETE, TRUNCATE, DROP, ALTER or any DDL/DML that changes data or schema.
                - The query MUST be syntactically valid and executable as-is.
                - Do NOT use placeholders like <table>, <column>, "..." or comments.
                - Do NOT use tables or columns that are not present in the provided schema.
                - If you are not sure which table/column to use, re-read the schema and make the best precise choice.
                    If it is genuinely impossible, return an empty "sql" and explain the limitation in "explanation".

            4. SCHEMA RESPECT:
                - Use ONLY tables and columns present in the schema snapshot.
                - Respect primary keys, foreign keys and NOT NULL when writing joins and conditions.
                - Prefer explicit JOINs with ON conditions based on foreign key relationships when relevant.

            5. RESPONSE FORMAT (VERY IMPORTANT):
                - You MUST return your answer STRICTLY as a single JSON object with this exact shape:

                    {
                    "sql": "SELECT ...",
                    "explanation": "Human-readable explanation of what this query does, in the same language as the user."
                    }

                - No extra fields.
                - No backticks.
                - No Markdown.
                - No natural language outside of this JSON object.

            6. LANGUAGE:
                - The "explanation" field MUST ALWAYS be written in the SAME LANGUAGE as the user's last message.
                - When deciding the language, you MUST ignore all previous messages and look ONLY at the latest user message.
                - NEVER mix languages. Use exactly one language — the same as in the user's latest message.
        `.trim()
    }

    private _buildSchemaPrompt(schemaSummary: string): string {
        return `
            Database schema snapshot (unified view from PostgreSQL/MySQL/MariaDB):

            ${schemaSummary}

            Remember:
                - Use ONLY the tables and columns listed above.
                - Prefer meaningful column lists in SELECT (avoid SELECT * unless the user explicitly wants all columns).
                - When joining tables, base your joins on the primary/foreign key relationships shown above.
        `.trim()
    }

    private _buildUserPrompt(userMessage: string): string {
        return `
            User request:

            ${userMessage}

            TASK:
                - Decide first if this message contains a real database/SQL-related request
                (asking for data, filtering, sorting, grouping, joining, aggregation, etc.)
                or if it is only a greeting / small talk / unrelated text.

            IF THE MESSAGE IS JUST A GREETING OR NOT REALLY ABOUT DATABASE/SQL:
                - Do NOT generate any SQL query.
                - Return:
                "sql": ""
                "explanation": a short greeting in the SAME LANGUAGE as the user message,
                                clearly stating that you are a database/SQL assistant and asking
                                the user to write a question related to the database.

            IF THE MESSAGE CONTAINS A DATABASE/SQL-RELATED REQUEST:
                - Generate exactly ONE safe SELECT or WITH ... SELECT query based ONLY on the given schema.

            LANGUAGE REQUIREMENT:
                - The "explanation" MUST be written strictly in the SAME LANGUAGE as this message from the user.
                - Detect the language ONLY from THIS message.
                - Do NOT mix languages.

            IF THE REQUEST CANNOT BE ANSWERED WITH THE GIVEN SCHEMA:
                - Set "sql" to an empty string "".
                - Set "explanation" (in the SAME LANGUAGE as the user message) to explain clearly
                why it is not possible and what columns/data would be needed.

            OUTPUT FORMAT:
                Return ONLY a single JSON object with the fields:
                {
                "sql": "...",
                "explanation": "..."
                }
            Do NOT add any other fields. Do NOT wrap it in backticks or Markdown.
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

    public async generateSQLFromNeutralLanguage(
        params: {
            schema: DbSchemaSnapshot
            dbType: DbType
            messages: ChatMessage[]
            userMessage: string
    }): Promise<AiSqlResponse> {

        const { schema, dbType, messages, userMessage } = params

        const schemaSummary = this._buildSchemaSummary(schema)
        const historyMessages = this._mapHistoryToOpenAiMessages(messages)

        const systemPrompt = this._buildSystemPrompt(dbType)
        const schemaPrompt = this._buildSchemaPrompt(schemaSummary)
        const userPrompt = this._buildUserPrompt(userMessage)

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