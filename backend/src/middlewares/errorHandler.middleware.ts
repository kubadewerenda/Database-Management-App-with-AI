import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger.js'
import {
    AppError,
    BadRequestException,
    InternalServerException,
} from '../lib/errors.js'
import { ErrorCodeEnum } from '../enums/error-code.enum.js'
import { ZodError } from 'zod'

export class ErrorHandler {
    static handle(err: unknown, req: Request, res: Response, _next: NextFunction) {
        const requestId = (res.locals as any)?.requestId
        let appErr: AppError

        if (err instanceof AppError) {
            appErr = err;
        } else if (err instanceof ZodError) {
            appErr = new BadRequestException('Validation error', ErrorCodeEnum.VALIDATION_ERROR);
        } else if (
            err &&
            typeof err === 'object' &&
            'statusCode' in (err as any) &&
            typeof (err as any).statusCode === 'number'
        ) {
            const e = err as any;
            appErr = new AppError(
                e.message || 'Error',
                e.statusCode,
                (e.code as any) || ErrorCodeEnum.INTERNAL_SERVER_ERROR,
            )
        } else {
            appErr = new InternalServerException((err as any)?.message || 'Internal Server Error');
        }

        logger.error(
            {
                requestId,
                method: req.method,
                path: req.originalUrl,
                status: appErr.statusCode,
                code: appErr.errorCode,
                err: appErr, 
            },
            appErr.message,
        )

        const payload: any = {
            error: true,
            code: appErr.errorCode ?? ErrorCodeEnum.INTERNAL_SERVER_ERROR,
            message: appErr.message,
            requestId,
        }

        if (process.env.NODE_ENV !== 'production') {
            payload.stack = appErr.stack
        }

        res.status(appErr.statusCode).json(payload)
    }
}
