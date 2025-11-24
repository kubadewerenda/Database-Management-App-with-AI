import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    ForeignKey, BelongsTo, HasMany, Index
} from 'sequelize-typescript'
import User from '../users/user.model.js'

@Table({
    tableName: 'projects',
    timestamps: true,
    indexes: [
        { fields: ['owner_id'] },
        { fields: ['is_active'] },
    ],  
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

    @AllowNull(true)
    @Column({ type: DataType.STRING })
    color!: string | null

    @AllowNull(false)
    @Column({ field: 'is_active', type: DataType.BOOLEAN, defaultValue: false })
    isActive!: boolean

    @ForeignKey(() => User)
    @AllowNull(false)
    @Index
    @Column({ field: 'owner_id', type: DataType.BIGINT })
    ownerId!: number

    @BelongsTo(() => User, { as: 'owner' })
    owner!: User
}
