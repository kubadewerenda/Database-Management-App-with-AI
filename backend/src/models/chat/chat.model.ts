import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    ForeignKey, BelongsTo, HasMany, Index
} from 'sequelize-typescript'
import Project from '../projects/project.model.js'
import Message from './message.model.js'

@Table({
    tableName: 'chats',
    timestamps: true,
    indexes: [{ fields: ['project_id'] }],
})
export default class Chat extends Model<Chat> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => Project)
    @AllowNull(false)
    @Index
    @Column({ field: 'project_id', type: DataType.BIGINT })
    projectId!: number

    @AllowNull(true)
    @Column(DataType.STRING)
    title!: string | null

    @BelongsTo(() => Project, { as: 'project' })
    project!: Project
}
