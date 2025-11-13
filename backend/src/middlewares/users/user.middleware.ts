import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import User from '../../models/users/user.model.js'
import * as helper from '../responseHelper.js'
// import { UnauthorizedException } from '../../lib/errors.js'

export async function isAuthenticated(req: Request, res: Response, next: NextFunction){
    if(!req.user){
        // throw new UnauthorizedException('User not signed in.')
        return helper.sendNotAuthenticated(res, 'Not authenticated')
    }
    return next()
}

export async function attachUserFromAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const bearer = req.headers.authorization
        const headerToken = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined
        const cookieToken = (req as any).cookies?.accessToken
        const token = headerToken || cookieToken
        if (!token) return next()

        const secret = process.env.JWT_SECRET
        if (!secret) return next()

        const decoded = jwt.verify(token, secret)
        if (typeof decoded !== 'object' || decoded === null) return next()

        const payload = decoded as JwtPayload
        const rawSub = payload.sub
        const userId = typeof rawSub === 'number'
            ? rawSub
            : typeof rawSub === 'string'
            ? Number(rawSub)
            : NaN

        if (!Number.isFinite(userId)) return next()

        const user = await User.findByPk(userId)
        if (user) req.user = user.toSafeJSON()
    } catch {
    }
    next()
}