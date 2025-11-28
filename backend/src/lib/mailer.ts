import nodemailer from 'nodemailer'

type MailOptions = {
    to: string
    subject: string
    html: string
}

/**
 * Tworzy transport do wysyłki maili na podstawie zmiennych środowiskowych.
 *
 * W .env ustaw:
 *  SMTP_HOST=smtp.gmail.com (albo inny)
 *  SMTP_PORT=587
 *  SMTP_USER=twoj_email@example.com
 *  SMTP_PASS=twoje_haslo_lub_app_password
 *  MAIL_FROM="DBAP App <no-reply@twojadomena.com>"
 */
function createTransport() {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT
        ? Number(process.env.SMTP_PORT)
        : 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
        throw new Error(
            'SMTP_HOST, SMTP_USER or SMTP_PASS not set in environment variables.',
        )
    }

    const secure = port === 465 

    const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    })

    return transport
}

export async function sendMail({ to, subject, html }: MailOptions) {
    const from =
        process.env.MAIL_FROM || 'DBAP App <no-reply@example.com>'

    const transporter = createTransport()

    const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
    })

    console.log('Email sent:', info.messageId)
}
