import {
    Table, Model, Column, DataType, ForeignKey, PrimaryKey
} from 'sequelize-typescript'
import SavedQuery from './savedQuery.model.js'
import Tag from './tag.model.js'

@Table({
    tableName: 'saved_query_tags',
    timestamps: false,
})
export default class SavedQueryTag extends Model<SavedQueryTag> {
    @PrimaryKey
    @ForeignKey(() => SavedQuery)
    @Column({ field: 'saved_query_id', type: DataType.BIGINT })
    savedQueryId!: number

    @PrimaryKey
    @ForeignKey(() => Tag)
    @Column({ field: 'tag_id', type: DataType.BIGINT })
    tagId!: number
}
