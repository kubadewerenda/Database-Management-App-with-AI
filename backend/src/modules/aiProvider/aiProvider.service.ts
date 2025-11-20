import OpenAI from 'openai'
import { AiChatMessage, AiSqlResponse } from '../../types/ai/aiProvider.js'
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

        this.client = new OpenAI()
    }
    private _isDbRelatedQuestion(userMessage: string, schema: DbSchemaSnapshot): boolean {
        const text = userMessage.toLowerCase()

        const keywords = [
            'tabela', 'table', 'column', 'kolumna', 'schema', 'schemat',
            'select', 'insert', 'update', 'delete', 'join', 'group by', 'order by',
            'wiersze', 'rekordy', 'records', 'rows', 'sql', 'query', 'zapytanie'
        ]

        if(keywords.some(k => text.includes(k))) {
            return true
        }

        for(const t of schema.tables) {
            if(text.includes(t.name.toLowerCase())) {
                return true
            }
        }

        return false
    }

    private _buildSchemaSummary(schema: DbSchemaSnapshot): string {
        const lines: string[] = []

        for (const table of schema.tables) {
            const cols = table.columns
                .map(c => {
                    const flags = []
                    if (c.isPrimaryKey) flags.push('PK')
                    if (c.isForeignKey) flags.push('FK')
                    if (!c.isNullable) flags.push('NOT NULL')

                    const flagsStr = flags.length ? ` (${flags.join(', ')})` : ''
                    return `- ${c.name}: ${c.dataType}${flagsStr}`
                })
                .join('\n')

            lines.push(
                `TABLE ${table.schema}.${table.name}:\n` +
                cols
            )
        }

        return lines.join('\n\n')
    }

    // ???
    private _mapHistoryToOpenAiMessages(history: AiChatMessage[]) {
        return history.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }))
    }


    public async generateSQLFromNeutralLanguage(params: {
        schema: DbSchemaSnapshot
        messages: AiChatMessage[]
        userMessage: string
    }): Promise<AiSqlResponse> {

        const { schema, messages, userMessage } = params

        // TODO: przekminic jak to zrobic z tymi promptami

        // if(!this._isDbRelatedQuestion(userMessage, schema)) {
        //     return {
        //         sql: '',
        //         explanation:
        //             'I can only help with questions related to this project\'s database: tables, columns, relationships and SQL queries. ' +
        //             'Please ask a question about the database schema or how to write a query based on it.',
        //     }
        // }

        const schemaSummary = this._buildSchemaSummary(schema)
        const historyMessages = this._mapHistoryToOpenAiMessages(messages)
        const systemPrompt = `
            You are an assistant that helps the user work with a PostgreSQL database for their project.

            You MUST follow these rules:

            1. You ONLY answer questions related to THIS project's database schema and SQL queries.
            2. You NEVER answer questions unrelated to the database (programming in general, life advice, etc.).
            3. You always return a SINGLE PostgreSQL SELECT query (optionally with WITH CTE) – no INSERT/UPDATE/DELETE/DDL.
            4. Use only tables and columns that exist in the schema below.
            5. If the user asks something that cannot be answered with the given schema, explain that and propose what data would be needed.

            Return your answer STRICTLY as JSON with the following shape:

            {
            "sql": "SELECT ...",
            "explanation": "Human-readable explanation of what this query does, in the same language as the user."
            }
        `.trim()

        const schemaPrompt = `
            Database schema (PostgreSQL):

            ${schemaSummary}

            Remember: use ONLY the tables and columns listed above.
        `.trim()

        const userPrompt = `
            User request:

            ${userMessage}

            Generate a single safe SELECT query (or SELECT with WITH CTE) that best answers this request.
        `.trim()

        try {
            const completion = await this.client.chat.completions.create({
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'system', content: schemaPrompt },
                    ...historyMessages,
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.2,
            })

            const raw = completion.choices[0]?.message?.content?.trim()
            if(!raw) {
                throw new Error('Empty response from AI')
            }

            let parsed: any
            try {
                parsed = JSON.parse(raw)
            } catch {
                const match = raw.match(/\{[\s\S]*\}/)
                if(!match) {
                    throw new Error(`Unable to parse AI response as JSON: ${raw}`)
                }
                parsed = JSON.parse(match[0])
            }

            if (!parsed.sql || !parsed.explanation) {
                throw new Error('AI response JSON does not contain "sql" and "explanation" fields.')
            }

            const lower = String(parsed.sql).trim().toLowerCase()
            if (!lower.startsWith('select') && !lower.startsWith('with')) {
                throw new Error('Generated SQL is not a SELECT/CTE query.')
            }

            return {
                sql: String(parsed.sql),
                explanation: String(parsed.explanation),
            }
        } catch(err: any) {
            throw new BadRequestException(`AI failed to generate SQL: ${err.message || String(err)}`)
        } 
    }
}