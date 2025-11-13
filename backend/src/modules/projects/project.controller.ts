import { Request, Response } from 'express'
import Controller from '../../controllers/main.controller.js'
import ProjectService from './project.service.js'

import { isAuthenticated } from '../../middlewares/users/user.middleware.js'
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js'


class ProjectController extends Controller{
    private ProjectService: ProjectService

    constructor(){
        super()
        this.ProjectService = new ProjectService()
    }


    public routes(): void {
    }
}

export default new ProjectController().router