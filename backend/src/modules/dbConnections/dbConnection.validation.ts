import z from 'zod'
import { DbType } from '../../enums/dbConnection/dbConnection.enum'

export const UpsertConnectionSchema = z
    .object({
        connectionString: z.string().min(1, 'Connection string is required.'),
        dbType: z.nativeEnum(DbType),
    })

export type UpsertConnectionInput = z.infer<typeof UpsertConnectionSchema>
