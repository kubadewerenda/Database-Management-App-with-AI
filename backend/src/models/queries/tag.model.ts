import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull, Unique, BelongsToMany
} from 'sequelize-typescript'
import SavedQuery from './savedQuery.model.js'
import SavedQueryTag from './savedQueryTag.model.js'

@Table({
    tableName: 'tags',
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }],
})
export default class Tag extends Model<Tag> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    name!: string

    @BelongsToMany(() => SavedQuery, () => SavedQueryTag, 'tagId', 'savedQueryId')
    savedQueries!: SavedQuery[]
}
