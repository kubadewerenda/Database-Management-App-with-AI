import { Response } from 'express'
import { logger } from '../lib/logger'


function sendAndLog(res: Response, code: number, err: any){
    logger.error(err);
    if(err.stack){
        logger.error(err.stack);
    }
    if(code === 500 && process.env.NODE_ENV === 'production'){
        return res.status(code).send();
    } else {
        return res.status(code).send(err);
    }
    
}

export function sendBadRequest(res: Response, err: any){
    return sendAndLog(res, 400, err);
}

export function sendNotAuthenticated(res: Response, err: any){
	return sendAndLog(res, 401, err);
}

export function sendUnauthorized(res: Response, err: any){
    return sendAndLog(res, 403, err);
}

export function sendConflict(res: Response, err: any){
    return sendAndLog(res, 409, err);
}

export function sendError(res: Response, err: any){
    return sendAndLog(res, 500, err);
}
