import { Sequelize, Model, ModelCtor } from 'sequelize-typescript'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fg from 'fast-glob'
import { logger } from '../lib/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

export class Orm {
    private static _sequelize: Sequelize | null = null

    static get sequelize(): Sequelize {
        if(!this._sequelize) throw new Error('ORM not initialized. Call Orm.init() first')
        return this._sequelize
    }

    static async init(opts?: { sync?: boolean, logSql?: boolean }) {
        if(this._sequelize) return

        const DB_URL = process.env.SUPABASE_DB_URL
        if(!DB_URL) throw new Error('Missing DB URL')

        const isProd = process.env.NODE_ENV === 'production'
        const logSql = opts?.logSql ?? process.env.SQL_LOG === '1'

        const sqlLogger = (mess: string, executionTimeMs?: number) => {
            const msg = mess.replace(/^Executing \(default\):\s*/i, '')
            const meta = executionTimeMs != null ? { ms: executionTimeMs } : undefined
            isProd ? logger.info(meta, msg) : logger.debug(meta, msg)
        }

        this._sequelize = new Sequelize(DB_URL, {
            dialect: 'postgres',
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 5,
                idle: 30_000,
                acquire: 60_000
            },
            define: {
                underscored: true,
                freezeTableName: true
            },
            benchmark: true,
            logQueryParameters: false,
            logging: logSql ? sqlLogger : false
        })

        const models = await this.loadModels()
        this._sequelize.addModels(models as ModelCtor<Model>[])
        logger.info({ models: models.map((m) => m.name) }, 'Models registered')

        await this._sequelize.authenticate()

        //DEV ONLY
        const doSync = opts?.sync ?? process.env.DB_SYNC === '1'
        if(doSync){
            await this._sequelize.sync({ alter: true })
            logger.info('Models synchronized')
        }

        logger.info('Sequelize ORM ready')
    }

    static async close(){
        if(!this._sequelize) return
        await this._sequelize.close()
        this._sequelize = null
    }

    private static async loadModels(): Promise<Array<typeof Model>> {
        const base = path.resolve(__dirname, '../models') 
        const patterns = [
            path.join(base, '**/*.model.ts').replace(/\\/g, '/'),
            path.join(base, '**/*.model.js').replace(/\\/g, '/'),
        ]

        const files = await fg(patterns, { absolute: true })
        if(!files.length) throw new Error('No models found')
        
        const modules = await Promise.all(files.map(
            async (f) => {
                const href = pathToFileURL(f).href
                try{
                    return { file: f, mod: await import(href) }
                }catch(e){
                    logger.error({ file: f, e }, 'Failed to import model file')
                    return null
                }
            }
        ))

        const isModelClass = (x: unknown): x is typeof Model => typeof x === 'function' && (x as any).prototype instanceof Model

        const classes: Array<typeof Model> = []
        for(const rec of modules){
            if(!rec) continue
            const candidate = (rec.mod as any)?.default
            if(isModelClass(candidate)) classes.push(candidate)
            else logger.warn({ file: rec.file }, 'Default export is not a model class')
        }

        if(!classes.length) throw new Error('No model classes found')
        
        return classes
    }
}
