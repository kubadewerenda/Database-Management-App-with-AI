import {
    Table, 
    Model, 
    Column, 
    DataType, 
    PrimaryKey, 
    AutoIncrement,
    AllowNull, 
    Unique,
    BelongsToMany, 
    ForeignKey, 
    BelongsTo, 
    Index
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
    @Index
    @Column({
        field: 'project_id',
        type: DataType.BIGINT,
        onDelete: 'CASCADE',
    })
    projectId!: number

    @AllowNull(false)
    @Index
    @Column(DataType.STRING)
    name!: string

    @BelongsTo(() => Project, {
        as: 'project',
    })
    project!: Project

    @BelongsToMany(() => SavedQuery, () => SavedQueryTag, 'tagId', 'savedQueryId')
    savedQueries!: SavedQuery[]
}
