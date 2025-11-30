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
    Index
} from 'sequelize-typescript'
import Project from '../projects/project.model.js'
import DbConnection from '../dbConnections/dbConnection.model.js'
import Executor from './executor.model.js'

@Table({
    tableName: 'executions',
    timestamps: true,
    indexes: [
        { fields: ['project_id'] },
        { fields: ['connection_id'] }
    ],
})
export default class Execution extends Model<Execution> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => Project)
    @AllowNull(false)
    @Index
    @Column({ field: 'project_id', type: DataType.BIGINT })
    projectId!: number

    @ForeignKey(() => DbConnection)
    @AllowNull(false)
    @Index
    @Column({ field: 'connection_id', type: DataType.BIGINT })
    connectionId!: number

    @ForeignKey(() => Executor)
    @AllowNull(false)          
    @Index
    @Column({ field: 'executor_id', type: DataType.BIGINT })
    executorId!: number | null

    @AllowNull(false)
    @Column(DataType.TEXT)
    sql!: string

    @AllowNull(true)
    @Column(DataType.INTEGER)
    rows!: number | null

    @AllowNull(true)
    @Column({ type: DataType.INTEGER, field: 'duration_ms' })
    durationMs!: number | null

    @AllowNull(true)
    @Column(DataType.JSONB)
    explained!: unknown | null

    @BelongsTo(() => Project, {
        as: 'project',
    })
    project!: Project

    @BelongsTo(() => DbConnection, {
        as: 'connection',
    })
    connection!: DbConnection

    @BelongsTo(() => Executor, {
        as: 'executor',
        onDelete: 'CASCADE',
    })
    executor!: Executor
}
