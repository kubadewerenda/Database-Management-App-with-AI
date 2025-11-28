import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import UserService from './user.service.js'

import * as userMd from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'

import { registerSchema, loginSchema, updateUserSchema, googleCallbackSchema, verifyEmailSchema } from './user.validation.js'

class UserController extends Controller {
    private userService: UserService

    constructor() {
        super()
        this.userService = new UserService()
    }

    private async _loginUser(res: Response, accessToken: string) {
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
    }

    private async register(req: Request, res: Response) {
        const data = registerSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const accessToken = await this.userService.register(data.data)
        await this._loginUser(res, accessToken)

        return res.status(201).json({
            message: 'User registered successfully.'
        })
    }

    private async login(req: Request, res: Response) {
        const data = loginSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const accessToken = await this.userService.login(data.data)
        await this._loginUser(res, accessToken)

        return res.status(201).json({ 
            message: 'User logged successfully.'
        })
    }

    private async loginGoogleRedirect(req: Request, res: Response) {
        const state = Math.random().toString(36).slice(2)

        res.cookie('oauth_state', state, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 10 * 60 * 1000, 
        })

        const googleAuthUrl = this.userService.buildGoogleAuthUrl(state)
        return res.redirect(googleAuthUrl)
    }

    private async loginGoogleCallback(req: Request, res: Response) {
        const parsed = googleCallbackSchema.safeParse(req.query)
        if (!parsed.success) throw parsed.error

        const { code, state } = parsed.data

        const stateCookie = req.cookies['oauth_state']
        if (!state || !stateCookie || state !== stateCookie) {
            return res.status(400).send('Invalid OAuth state.')
        }

        res.cookie('oauth_state', '', {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires: new Date(0),
        })

        const accessToken = await this.userService.loginWithGoogle(code)

        await this._loginUser(res, accessToken)

        const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173'

        return res.redirect(redirectTo)
    }

    private async verifyEmail(req: Request, res: Response) {
        const parsed = verifyEmailSchema.safeParse(req.query)
        if (!parsed.success) throw parsed.error

        await this.userService.verifyEmail(parsed.data.token)

        return res.status(200).json({
            message: 'Email verified successfully.'
        })
    }

    private async logout(req: Request, res: Response) {
        res.cookie('accessToken', '', {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires: new Date(0),
        })

        return res.status(200).json({ 
            message: 'Signed out.' 
        })
    }

    private async getUser(req: Request, res: Response) {
        return res.status(200).json({ 
            user: req.user || null 
        })
    }

    private async updateUser(req: Request, res: Response) {
        const data = updateUserSchema.safeParse(req.body)
        if(!data.success) throw data.error

        const updatedUser = await this.userService.updateUser(req.user?.id, data.data)

        return res.status(200).json({ 
            message: 'User updated successfully.',
            user: updatedUser 
        })
    }

    public routes(): void {
        this.router.post('/register', asyncHandler(this.register.bind(this)))
        this.router.post('/login', asyncHandler(this.login.bind(this)))
        this.router.get('/login/google', asyncHandler(this.loginGoogleRedirect.bind(this)))
        this.router.get('/login/google/callback', asyncHandler(this.loginGoogleCallback.bind(this)))
        this.router.post('/logout', userMd.isUserPermitted, asyncHandler(this.logout.bind(this)))
        this.router.get('/me', userMd.isUserPermitted, asyncHandler(this.getUser.bind(this)))
        this.router.patch('/me/update', userMd.isUserPermitted, asyncHandler(this.updateUser.bind(this)))
        this.router.get('/verify-email', asyncHandler(this.verifyEmail.bind(this)))
    }
}

export default new UserController().router