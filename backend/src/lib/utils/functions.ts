import Project from "../../models/projects/project.model"
import { BadRequestException, NotFoundException } from "../errors"

export async function _ensureProjectOwned(projectId: number, userId: number): Promise<Project> {
    if (!projectId || !userId) {
        throw new BadRequestException('Project and user are required.')
    }

    const project = await Project.findOne({
        where: { id: projectId, ownerId: userId }
    })

    if (!project) {
        throw new NotFoundException('Project not found.')
    }

    return project
}