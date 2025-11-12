import 'express-serve-static-core'

declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: number
            email: string
            role?: string
            status?: string
            provider?: string
            [k: string]: any
        }
    }
}
