import express, { Application, NextFunction, Request, Response, Router } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { registerRequestLogging } from './middlewares/logging.middleware.js'
import { NotFoundHandler } from './middlewares/notFound.middleware.js'
import { ErrorHandler } from './middlewares/errorHandler.middleware.js'

import cookieParser from 'cookie-parser'
import { attachUserFromAuth } from './middlewares/users/user.middleware.js'

import UserController from './modules/users/user.controller.js'
import ProjectController from './modules/projects/project.controller.js'

export class App {
    private app: Application

    constructor() {
        this.app = express()

        this.registerMiddlewares()
        this.registerRoutes()
        this.registerErrorHandlers()

    }

    private registerMiddlewares() {
        registerRequestLogging(this.app)

        this.app.use(helmet())
        this.app.use(cors({ origin: true, credentials: true }))
        this.app.use(express.json())

        this.app.use(cookieParser())        
        this.app.use(attachUserFromAuth) 
    }

    private registerRoutes() {
        this.app.use('/user', UserController)
        this.app.use('/project', ProjectController)
        
        this.app.use(NotFoundHandler.handle)
    }

    private registerErrorHandlers() {
        this.app.use(ErrorHandler.handle)
    }

    public get instance() {
        return this.app
    }
}
