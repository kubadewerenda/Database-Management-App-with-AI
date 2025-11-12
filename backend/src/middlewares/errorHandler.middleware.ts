import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger.js'
import {
    AppError,
    BadRequestException,
    InternalServerException,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
} from '../lib/errors.js'
import { ErrorCodeEnum } from '../enums/error-code.enum.js'
import { ZodError } from 'zod'
import { UniqueConstraintError, ValidationError as SequelizeValidationError } from 'sequelize'

const isProd = process.env.NODE_ENV === 'production'

function zodDetails(err: ZodError) {
    return err.issues.map(i => ({
        field: i.path.join('.') || 'root',
        message: i.message,
        code: i.code,
    }))
}

export class ErrorHandler {
    static handle(err: unknown, req: Request, res: Response, _next: NextFunction) {
        const requestId = (res.locals as any)?.requestId
        let appErr: AppError
        let details: any[] | undefined

        if (err instanceof ZodError) {
            appErr = new BadRequestException('Validation error', ErrorCodeEnum.VALIDATION_ERROR)
            details = zodDetails(err)
        }
        else if (err instanceof UniqueConstraintError) {
            appErr = new ConflictException('Resource already exists', ErrorCodeEnum.UNIQUE_VIOLATION as any)
            details = err.errors.map(e => ({
                field: e.path ?? 'unknown',
                message: e.message,
                value: e.value,
                type: e.validatorKey,
            }))
        } else if (err instanceof SequelizeValidationError) {
            appErr = new BadRequestException('Invalid data', ErrorCodeEnum.VALIDATION_ERROR)
            details = err.errors.map(e => ({
                field: e.path ?? 'unknown',
                message: e.message,
                type: e.validatorKey,
            }))
        }
        else if (
            err &&
            typeof err === 'object' &&
            'type' in err &&
            (err as any).type === 'entity.parse.failed'
        ) {
            appErr = new BadRequestException('Malformed JSON body', ErrorCodeEnum.VALIDATION_ERROR)
        }
        else if (err instanceof AppError) {
            appErr = err
        }
        else if (
            err &&
            typeof err === 'object' &&
            'statusCode' in (err as any) &&
            typeof (err as any).statusCode === 'number'
        ) {
            const e = err as any
            appErr = new AppError(
                e.message || 'Error',
                e.statusCode,
                (e.code as any) || ErrorCodeEnum.INTERNAL_SERVER_ERROR,
            )
        }
        else {
            appErr = new InternalServerException((err as any)?.message || 'Internal Server Error')
        }

        logger.error(
            {
                requestId,
                method: req.method,
                path: req.originalUrl,
                status: appErr.statusCode,
                code: appErr.errorCode,
                err: appErr,
                details,
            },
            appErr.message,
        )

        const payload: any = {
            error: true,
            code: appErr.errorCode ?? ErrorCodeEnum.INTERNAL_SERVER_ERROR,
            message: appErr.message,
            requestId,
        }
        if (details?.length) payload.details = details
        if (!isProd) payload.stack = appErr.stack

        res.status(appErr.statusCode).json(payload)
    }
}
