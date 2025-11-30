export type CredentialsRegisterD = {
    username: string
    email: string
    password: string
    passwordCheck: string
}

export type CredentialsD = { email: string, password: string }

export type UpdateMeD = {
    username?: string,
    email?: string
    currentPassword?: string
    newPassword?: string
}