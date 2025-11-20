import { AiChatMessage, AiSqlResponse } from '../../types/ai/aiProvider'
import { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache'

export default class AiProviderService {
    // TODO: tutaj dodac dzialajacy mechanizm llma
    public async generateSQLFromNeutralLanguage(params: {
        schema: DbSchemaSnapshot
        messages: AiChatMessage[]
        userMessage: string
    }): Promise<AiSqlResponse> {
        const { userMessage } = params

        // TODO: dodac obsluge ai
        return {
            sql: 'SELECT 1;',
            explanation: `Lorem ipsum elar, Lorem ipsum elar, Lorem ipsum elar, Lorem ipsum elar `
        }
    }
}