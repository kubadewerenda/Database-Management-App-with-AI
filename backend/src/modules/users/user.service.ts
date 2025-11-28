import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'

import User from '../../models/users/user.model.js'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'
import { BadRequestException, UnauthorizedException } from '../../lib/errors.js'
import { ErrorCodeEnum } from '../../enums/error-code.enum.js'
import { sendMail } from '../../lib/mailer.js'

type CredentialsRegisterD = {
    username: string
    email: string
    password: string
    passwordCheck: string
}
type CredentialsD = { email: string, password: string }
type UpdateMeD = {
    username?: string,
    email?: string
    currentPassword?: string
    newPassword?: string
}

export default class UserService {
    private readonly bcryptRounds: number = Number(process.env.BCRYPT_ROUNDS)

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

    private _createGoogleOAuthClient(redirectUri: string): OAuth2Client {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET

        if (!clientId || !clientSecret) {
            throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.')
        }

        return new OAuth2Client({
            clientId,
            clientSecret,
            redirectUri,
        })
    }

    private async _createVerificationToken(user: User): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex')
        const hash = crypto.createHash('sha256').update(token).digest('hex')

        user.verificationTokenHash = hash
        await user.save()

        return token
    }

    private async sendVerificationEmail(user: User): Promise<void> {
        const appUrl = process.env.FRONTEND_URL_BASE || 'http://localhost:5173'
        const token = await this._createVerificationToken(user)

        const verificationUrl = `${appUrl}/verify-email?token=${token}`

        const html = `
            <p>Cześć!</p>
            <p>Dziękujemy za rejestrację w <strong>DBAP</strong>.</p>
            <p>Aby potwierdzić swój adres e-mail, kliknij w poniższy link:</p>
            <p><a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">Zweryfikuj e-mail</a></p>
            <p>Jeśli to nie Ty zakładałeś konto, możesz zignorować tę wiadomość.</p>
        `.trim()

        await sendMail({
            to: user.email,
            subject: 'Potwierdzenie adresu e-mail - DBAP',
            html,
        })
    }

    public async verifyEmail(token: string) {
        if(!token) {
            throw new BadRequestException('Verification token is required.')
        }

        const hash = crypto.createHash('sha256').update(token).digest('hex')

        const user = await User.findOne({
            where: { verificationTokenHash: hash },
        })

        if (!user) {
            throw new BadRequestException('Invalid or expired verification token.')
        }

        user.verificationTokenHash = null

        if (user.status === UserStatus.PENDING) {
            user.status = UserStatus.ACTIVE
        }

        await user.save()
    }

    public async register({ 
        username, 
        email, 
        password, 
        passwordCheck 
    }: CredentialsRegisterD) {
        if(!email || !password){
            throw new BadRequestException('Email and password are required.')
        }

        if(password !== passwordCheck) {
            throw new BadRequestException('Passwords must be the same.', ErrorCodeEnum.VALIDATION_ERROR)
        }

        const exists = await User.findOne({ 
            where: { email: email.trim().toLowerCase() } 
        })
        if(exists) throw new BadRequestException('Email already in use.')

        const passwordHash = await this._hashPassword(password)

        const user = await User.create({
            email,
            username: username.trim(),
            passwordHash,
            provider: AuthProvider.LOCAL,
            status: UserStatus.PENDING,
            role: UserRole.USER,
        })

        try {
            await this.sendVerificationEmail(user)
        } catch (err) {
            throw new BadRequestException('Verification failed. Try again later.')
        }

        const accessToken = this._signAccessToken(user.id)

        return accessToken
    }

    public async login({
        email, 
        password 
    }: CredentialsD) {
        if(!email || !password) {
            throw new BadRequestException('Email and password are required.')
        }

        const user = await User.findOne({ 
            where: { email: email.trim().toLowerCase() } 
        })
        if(!user || !user.passwordHash) {
            throw new BadRequestException('Invalid email address.')
        }

        if(user.status === UserStatus.BANNED) {
            throw new BadRequestException('Account is banned.')
        }

        if (user.status === UserStatus.PENDING) {
            throw new BadRequestException('Please verify your email address first.')
        }

        const isPassOk = await this._verifyPassword(password, user.passwordHash)
        if(!isPassOk) throw new BadRequestException('Invalid password.')
        
        const accessToken = this._signAccessToken(user.id)

        return accessToken
    }

    public async updateUser(
        userId: number | undefined, 
        { 
            username, 
            email, 
            currentPassword, 
            newPassword 
        }: UpdateMeD) {
        const user = await User.findByPk(userId)
        if (!user) throw new UnauthorizedException('User not found')

        if (username !== undefined) {
            user.username = username.trim()
        }

        if (email && email.trim().toLowerCase() !== user.email) {
            const exists = await User.findOne({ 
                where: { email: email.trim().toLowerCase() } 
            })
            if (exists) throw new BadRequestException('Email already in use')
                
            user.email = email.trim().toLowerCase()
        }

        if (currentPassword || newPassword) {
            if (!currentPassword || !newPassword) {
                throw new BadRequestException('Both current password and new password are required.')
            }
            if (!user.passwordHash) {
                throw new BadRequestException('Password cannot be changed for this account.')
            }
            
            const isPassOk = await this._verifyPassword(currentPassword, user.passwordHash)
            if (!isPassOk) throw new BadRequestException('Current password is incorrect.', ErrorCodeEnum.VALIDATION_ERROR)

            const isDifferent = await this._verifyPassword(newPassword, user.passwordHash)
            if (isDifferent) throw new BadRequestException('New password has to be different than the last one.', ErrorCodeEnum.VALIDATION_ERROR) 
                
            const hash = await this._hashPassword(newPassword)
            user.passwordHash = hash
        }

        await user.save()
        return user.toSafeJSON()
    }

    // GOOGLE OAUTH

    public buildGoogleAuthUrl(state: string): string {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
            'http://localhost:8000/user/login/google/callback'

        if (!clientId) {
            throw new Error('GOOGLE_CLIENT_ID not set.')
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            access_type: 'offline',
            prompt: 'consent',
        })

        return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
    }

    public async loginWithGoogle(code: string) {
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
            'http://localhost:8000/user/login/google/callback'

        const client = this._createGoogleOAuthClient(redirectUri)

        const result = await client.getToken(code)
        const tokens = result.tokens ?? {}

        const idToken = tokens.id_token
        if(!idToken) {
            throw new BadRequestException('Google did not return id_token.')
        }

        let payload: any
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            })
            payload = ticket.getPayload()
        } catch {
            throw new BadRequestException('Invalid Google token.')
        }

        if (!payload) {
            throw new BadRequestException('Invalid Google token payload.')
        }

        const email = (payload.email as string | undefined)?.trim().toLowerCase()
        const sub = payload.sub as string | undefined

        if (!email || !sub) {
            throw new BadRequestException(
                'Google account must have email and sub.',
            )
        }

        const username =
            (payload.name as string | undefined) || email.split('@')[0]

        let user = await User.findOne({ where: { email } })

        if (!user) {
            user = await User.create({
                email,
                username,
                passwordHash: null,
                provider: AuthProvider.GOOGLE,
                oauthSub: sub,
                status: UserStatus.ACTIVE,
                role: UserRole.USER,
            })
        } else {
            if (user.status === UserStatus.BANNED) {
                throw new BadRequestException('Account is banned.')
            }

            if (user.provider === AuthProvider.GOOGLE) {
                if (user.oauthSub && user.oauthSub !== sub) {
                    throw new BadRequestException('Google account mismatch.')
                }
                if (!user.oauthSub) {
                    user.oauthSub = sub
                    await user.save()
                }
            } else {
                if (!user.oauthSub) {
                    user.oauthSub = sub
                    await user.save()
                }
            }
        }

        const accessToken = this._signAccessToken(user.id)
        return accessToken
    }
}