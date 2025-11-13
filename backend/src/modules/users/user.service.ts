import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../../models/users/user.model.js'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'
import { BadRequestException, UnauthorizedException} from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'

type CredentialsRegisterD = { email: string, password: string, passwordCheck: string }
type CredentialsD = { email: string, password: string }
type UpdateMeD = {
    email?: string
    currentPassword?: string
    newPassword?: string
}

export default class UserService {
    private readonly bcryptRounds = 10

    private _ensureJWTSecret(): string {
        const secret = process.env.JWT_SECRET
        if(!secret) throw new Error('JWT_SECRET not set.')
        return secret
    }

    private _signAccessToken(userId: number): string {
        const secret = this._ensureJWTSecret()
        return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' })
    }

    private async _hashPassword(password: string) {
        return bcrypt.hash(password, this.bcryptRounds)
    }

    private async _verifyPassword(password: string, hash: string) {
        return bcrypt.compare(password, hash)
    }

    public _verifyToken(token: string): { sub: number; iat: number; exp: number } {
        return jwt.verify(token, this._ensureJWTSecret()) as any
    }

    public async register({ email, password, passwordCheck }: CredentialsRegisterD) {
        if(!email || !password){
            throw new BadRequestException('Email and password are required.')
        }

        if(password !== passwordCheck){
            throw new BadRequestException('Passwords must be the same.', ErrorCodeEnum.VALIDATION_ERROR)
        }

        const exists = await User.findOne({ where: { email: email.trim().toLowerCase() } })
        if(exists) throw new BadRequestException('Email already in use.')

        const passwordHash = await this._hashPassword(password)

        const user = await User.create({
            email,
            passwordHash,
            provider: AuthProvider.LOCAL,
            status: UserStatus.ACTIVE,
            role: UserRole.USER,
        })

        const accessToken = this._signAccessToken(user.id)

        return { user: user.toSafeJSON(), accessToken }
    }

    public async login({ email, password }: CredentialsD) {
        if(!email || !password){
            throw new BadRequestException('Email and password are required.')
        }

        const user = await User.findOne({ where: { email: email.trim().toLowerCase() } })
        if(!user || !user.passwordHash) {
            throw new BadRequestException('Invalid email address.')
        }

        if(user.status === UserStatus.BANNED) {
            throw new BadRequestException('Account is banned.')
        }

        const isPassOk = await this._verifyPassword(password, user.passwordHash)
        if(!isPassOk) throw new BadRequestException('Invalid password.')
        
        const accessToken = this._signAccessToken(user.id)

        return { user: user.toSafeJSON(), accessToken }
    }

    public async update_user(userId: number | undefined, { email, currentPassword, newPassword }: UpdateMeD){
        const user = await User.findByPk(userId)
        if (!user) throw new UnauthorizedException('User not found')

        if (email && email.trim().toLowerCase() !== user.email) {
            const exists = await User.findOne({ where: { email: email.trim().toLowerCase() } })
            if (exists) throw new BadRequestException('Email already in use')
                
            user.email = email.trim().toLowerCase()
        }

        if (currentPassword || newPassword) {
            if (!currentPassword || !newPassword) {
                throw new BadRequestException('Both currentPassword and newPassword are required.')
            }
            if (!user.passwordHash) {
                throw new BadRequestException('Password cannot be changed for this account.')
            }
            
            const isPassOk = await this._verifyPassword(currentPassword, user.passwordHash)
            if (!isPassOk) throw new BadRequestException('Current password is incorrect.', ErrorCodeEnum.VALIDATION_ERROR)

            const isDifferent = await this._verifyPassword(newPassword, user.passwordHash)
            if (isDifferent) throw new BadRequestException('New password has to be different than the last one.', ErrorCodeEnum.VALIDATION_ERROR) 
                
            const hash = await bcrypt.hash(newPassword, 10)
            user.passwordHash = hash
        }

        await user.save()
        return user.toSafeJSON()
    }
}