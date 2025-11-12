import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    ForeignKey, BelongsTo, HasMany, Index
} from 'sequelize-typescript'
import User from '../users/user.model.js'

@Table({
    tableName: 'projects',
    timestamps: true,
    indexes: [{ fields: ['owner_id'] }],
})
export default class Project extends Model<Project> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @AllowNull(false)
    @Column(DataType.STRING)
    name!: string

    @AllowNull(true)
    @Column(DataType.TEXT)
    description!: string | null

    @ForeignKey(() => User)
    @AllowNull(false)
    @Index
    @Column({ field: 'owner_id', type: DataType.BIGINT })
    ownerId!: number

    @BelongsTo(() => User, { as: 'owner' })
    owner!: User
}
