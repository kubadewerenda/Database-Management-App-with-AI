import 'dotenv/config'
import 'reflect-metadata'
import http from 'http'
import { App } from './app.js'
import { DbConnect } from './db/connect.js'
import { Orm as Sequelize} from './db/sequelize.js'
import { logger } from './lib/logger.js'

const PORT = Number(process.env.PORT || 8000)

let server: http.Server | undefined

async function bootstrap() {
    try {
        await DbConnect.init()
        await Sequelize.init()

        const app = new App().instance
        server = http.createServer(app)

        server.listen(PORT, () => {
            
        })
    } catch (err: any) {
        logger.error(`Startup failed: ${err?.message || err}`)
        process.exit(1)
    }
}

bootstrap();

process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

async function shutdown(reason: string, code = 0) {
    logger.warn(`Shutting down (${reason})...`)
    try {
        if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
    } catch {}
    try { 
        DbConnect.close()
    } catch {}
    try {
        await Sequelize.close()
    } catch {}
    logger.info('HTTP server closed. Bye!')
    process.exit(code)
}

process.on('unhandledRejection', (err: any) => {
    logger.error({ err }, 'Unhandled Rejection')
    shutdown('unhandledRejection', 1)
});
process.on('uncaughtException', (err: any) => {
    logger.error({ err }, 'Uncaught Exception')
    shutdown('uncaughtException', 1)
});
