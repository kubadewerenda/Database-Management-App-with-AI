import z from 'zod'
import { ExportFormat } from '../../enums/executor/executor.enum'

export const querySchema = z.object({
    sql: z.string().min(1, 'SQL is required.'),
    maxReturnedRows: z
        .coerce.number()
        .int('Rows must be an integer.')
        .min(1, 'Rows must be at least 1.')
        .max(1000, 'Rows must be at most 1000.')
        .optional(),
    explain: z.boolean().optional()
})

export const executorIdSchema = z.coerce.number().int().positive()

export const executorUpdateSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Executor name must be at least 1 character.')
        .max(100, 'Executor name must be at most 100 characters.'),
})

export const executionIdSchema = z.coerce.number().int().positive()

export const exportFormatTypeSchema = z.object({
    type: z.nativeEnum(ExportFormat)
})
