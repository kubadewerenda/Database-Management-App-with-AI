import { NextFunction, Request, Response } from 'express'
import * as helper from '../responseHelper.js'

export async function isAuthenticated(req: Request, res: Response, next: NextFunction){
    if(!req.user){
        return helper.sendNotAuthenticated(res, 'Not authenticated')
    }
    return next()
}
