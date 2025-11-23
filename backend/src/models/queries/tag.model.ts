import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull, Unique, BelongsToMany,
    ForeignKey
} from 'sequelize-typescript'
import SavedQuery from './savedQuery.model.js'
import SavedQueryTag from './savedQueryTag.model.js'
import Project from '../projects/project.model.js'

@Table({
    tableName: 'tags',
    timestamps: true,
    indexes: [
        { fields: ['project_id'] },
        { unique: true, fields: ['project_id', 'name'] },
    ],
})
export default class Tag extends Model<Tag> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => Project)
    @AllowNull(false)
    @Column({ field: 'project_id', type: DataType.BIGINT })
    projectId!: number

    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    name!: string

    @BelongsToMany(() => SavedQuery, () => SavedQueryTag, 'tagId', 'savedQueryId')
    savedQueries!: SavedQuery[]
}
