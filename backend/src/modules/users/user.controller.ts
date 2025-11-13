import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import UserService from './user.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'

import { registerSchema, loginSchema, updateUserSchema } from './user.validation.js'

class UserController extends Controller{
    private userService: UserService

    constructor(){
        super()
        this.userService = new UserService()
    }

    private async _login_user(res: Response, accessToken: string){
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
    }

    private async register(req: Request, res: Response){
        const data = registerSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const { user, accessToken } = await this.userService.register(data.data)
        await this._login_user(res, accessToken)

        return res.status(201).json({ user, accessToken })
    }

    private async login(req: Request, res: Response){
        const data = loginSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const { user, accessToken } = await this.userService.login(data.data)
        await this._login_user(res, accessToken)

        return res.status(201).json({ user, accessToken })
    }

    private async logout(req: Request, res: Response){
        res.cookie('accessToken', '', {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires: new Date(0),
        })

        return res.status(200).json({ message: 'Signed out.' })
    }

    private async get_user(req: Request, res: Response){
        return res.json({ user: req.user || null })
    }

    private async update_user(req: Request, res: Response){
        const data = updateUserSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const updatedUser = await this.userService.update_user(req.user?.id, data.data)

        return res.status(200).json({ user: updatedUser })
    }

    public routes(): void {
        this.router.post('/register', asyncHandler(this.register.bind(this)))
        this.router.post('/login', asyncHandler(this.login.bind(this)))
        this.router.post('/logout', userMd.isAuthenticated, asyncHandler(this.logout.bind(this)))
        this.router.get('/me', userMd.isAuthenticated, asyncHandler(this.get_user.bind(this)))
        this.router.patch('/me/update', userMd.isAuthenticated, asyncHandler(this.update_user.bind(this)))
    }
}

export default new UserController().router