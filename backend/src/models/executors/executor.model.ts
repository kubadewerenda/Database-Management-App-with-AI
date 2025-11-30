import {
    Table,
    Model,
    Column,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    ForeignKey,
    BelongsTo,
    HasMany,
    Index,
    Default,
} from 'sequelize-typescript'
import Project from '../projects/project.model.js'
import Execution from './execution.model.js'

@Table({
    tableName: 'executors',
    timestamps: true,
    indexes: [
        { fields: ['project_id'] },
        { unique: true, fields: ['project_id', 'name'] },
    ],
})
export default class Executor extends Model<Executor> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => Project)
    @AllowNull(false)
    @Index
    @Column({ field: 'project_id', type: DataType.BIGINT })
    projectId!: number

    @AllowNull(false)
    @Column(DataType.STRING)
    name!: string

    @AllowNull(false)
    @Default(false)
    @Column({ field: 'is_pinned', type: DataType.BOOLEAN })
    isPinned!: boolean

    @BelongsTo(() => Project, { as: 'project' })
    project!: Project

    @HasMany(() => Execution, {
        foreignKey: 'executorId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    executions!: Execution[]
}
