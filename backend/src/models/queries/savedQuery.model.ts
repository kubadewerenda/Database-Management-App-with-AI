import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    ForeignKey, BelongsTo, BelongsToMany, HasMany, Index
} from 'sequelize-typescript'
import Project from '../projects/project.model.js'
import Tag from './tag.model.js'
import SavedQueryTag from './savedQueryTag.model.js'

@Table({
    tableName: 'saved_queries',
    timestamps: true,
    indexes: [{ fields: ['project_id'] }, { fields: ['name'] }],
})
export default class SavedQuery extends Model<SavedQuery> {
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

    @AllowNull(true)
    @Column(DataType.TEXT)
    description!: string | null

    @AllowNull(false)
    @Column(DataType.TEXT)
    sql!: string

    @BelongsTo(() => Project, { as: 'project' })
    project!: Project

    @BelongsToMany(() => Tag, () => SavedQueryTag, 'savedQueryId', 'tagId')
    tags!: Tag[]
}
