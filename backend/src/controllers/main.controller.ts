import { Router, Request, Response } from 'express'
import { Default } from 'sequelize-typescript'

export default abstract class Controller {
    public router: Router

    constructor() {
        this.router = Router()
        this.routes()
    }

    public abstract routes(): void
}