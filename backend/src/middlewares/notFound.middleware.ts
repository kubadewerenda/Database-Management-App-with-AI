import type { Request, Response, NextFunction } from 'express'
import { NotFoundException } from '../lib/errors.js'

export class NotFoundHandler {
    static handle(_req: Request, _res: Response, next: NextFunction) {
        next(new NotFoundException('Route not found'))
    }
}
