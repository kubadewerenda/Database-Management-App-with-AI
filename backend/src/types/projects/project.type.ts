import Executor from "../../models/executors/executor.model"
import Project from "../../models/projects/project.model"
import { 
    DbSchemaSnapshot, 
    SupportedDbType 
} from "../dbConnections/dbConnection.type"

export type ProjectCreateData = {
    name: string,
    description?: string | null
    color?: string | null
}

export type ProjectUpdateData = {
    name?: string,
    description?: string | null
    color?: string | null
}

export type ProjectOverview = {
    message: string,
    project: Project,
    dbConnection: {
        connected: string
        dbType: SupportedDbType | null
        latencyMs: number | null
    }
    schema: DbSchemaSnapshot,
    executors: Executor[] | null
    chat: {
        id: number
    }
}

export type ProjectListOptions = {
    page?: number
    limit?: number
    search?: string
    order?: string
}

export type ProjectListResult = {
    projects: Project[]
    page: number
    limit: number
    total: number
    totalPages: number
}