import { Request, Response } from 'express'
import { email, z } from 'zod'
import * as helper from '../../middlewares/responseHelper.js'
import Controller from '../../controllers/main.controller.js'
import UserService from './user.service.js'
import { isAuthenticated } from '../../middlewares/users/user.middleware.js'


const registerSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
})

const loginschema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1)
})

const updateUserSchema = z.object({
    email: z.string().trim().email().optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(1).max(128).optional(),
}).refine(
    (d) => !(d.currentPassword || d.newPassword) || (d.currentPassword && d.newPassword),
    { message: 'Both currentPassword and newPassword are required to change password' }
)

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
        try {
            const data = registerSchema.parse(req.body)
            const { user, accessToken } = await this.userService.register(data)

            this._login_user(res, accessToken)

            return res.status(201).json({ user })
        } catch (err) {
            return helper.sendError(res, err)
        }
    }

    private async login(req: Request, res: Response){
        try {
            const data = loginschema.parse(req.body)
            const { user, accessToken } = await this.userService.login(data)

            this._login_user(res, accessToken)
            return res.status(201).json({ user })
        } catch (err) {
            return helper.sendError(res, err)
        }
    }

    private async logout(req: Request, res: Response){
        res.cookie('accessToken', '', {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires: new Date(0),
        })
        return res.json({ ok: true })
    }

    private async get_user(req: Request, res: Response){
        return res.json({ user: req.user || null })
    }

    private async update_user(req: Request, res: Response){
        try {
            const data = updateUserSchema.parse(req.body)
            const updatedUser = await this.userService.update_user(req.user?.id, data)
            return res.json({ user: updatedUser })
        } catch (err) {
            return helper.sendError(res, err)
        }
    }

    public routes(): void {
        this.router.post('/register', this.register.bind(this))
        this.router.post('/login', this.login.bind(this))
        this.router.post('/logout', isAuthenticated, this.logout.bind(this))
        this.router.get('/me', isAuthenticated, this.get_user.bind(this))
        this.router.patch('/me/update', isAuthenticated, this.update_user.bind(this))
    }
}

export default new UserController().router