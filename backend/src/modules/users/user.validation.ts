import { z } from 'zod'

export const registerSchema = z
    .object({
        email: z.string().trim().email(),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must be at most 128 characters')
            .regex( /[a-z]/,
                'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(
                /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/,
                'Password must contain at least one special character'
            ),
        passwordCheck: z.string().min(1, 'Both passwords are required.'),
    })
    .refine((d) => d.password === d.passwordCheck, {
        message: 'Passwords must be the same.',
        path: ['passwordCheck'],
    })

export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1, 'Password is required'),
})

export const updateUserSchema = z
    .object({
        email: z.string().trim().email().optional(),
        currentPassword: z.string().min(1).optional(),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must be at most 128 characters')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(
                /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/,
                'Password must contain at least one special character'
            )
            .optional(),
    })
    .refine(
        (d) =>
        !(d.currentPassword || d.newPassword) ||
        (d.currentPassword && d.newPassword),
        {
        message: 'Both passwords are required to change password',
        path: ['currentPassword'],
        }
    )