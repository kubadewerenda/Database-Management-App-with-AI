import type { Application, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import { logger } from '../lib/logger.js'

const isProd = process.env.NODE_ENV === 'production'

function levelFromStatus(status: number) {
    if (status >= 500) return 'error'
    if (status >= 400) return 'warn'
    return 'info'
}

export function registerRequestLogging(app: Application) {
    app.use((req: Request, res: Response, next: NextFunction) => {
        const start = process.hrtime.bigint()

        const incoming = req.headers['x-request-id']
        const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || nanoid();
        (res.locals as any).requestId = requestId
        res.setHeader('x-request-id', requestId)

        if (!isProd) {
            logger.debug(
                {
                requestId,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                contentLength: req.headers['content-length'] || undefined,
                },
                'request',
            )
        }

        res.on('finish', () => {
            const ms = Number(process.hrtime.bigint() - start) / 1e6
            const status = res.statusCode ?? 0
            const level = levelFromStatus(status);

            (logger as any)[level](
                {
                requestId,
                method: req.method,
                url: req.originalUrl,
                status,
                ms,
                contentLength: res.get('content-length') || undefined,
                },
                'response',
            )
        })

        res.on('close', () => {
            if (!res.writableEnded) {
                const ms = Number(process.hrtime.bigint() - start) / 1e6
                logger.warn(
                {
                    requestId,
                    method: req.method,
                    url: req.originalUrl,
                    ms,
                },
                'response aborted by client',
                )
            }
        })

        res.on('error', (err) => {
            logger.error(
                {
                requestId,
                method: req.method,
                url: req.originalUrl,
                err,
                },
                'response error',
            )
        })

        next()
    })
}