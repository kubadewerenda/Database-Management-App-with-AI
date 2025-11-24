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
    HasOne,
    Index,
    Default,
} from 'sequelize-typescript'
import User from '../users/user.model.js'
import DbConnection from './connection.model.js'

@Table({
    tableName: 'projects',
    timestamps: true,
    indexes: [
        { fields: ['owner_id'] },
        { fields: ['created_at'] },
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
    @Default('#3b82f6')
    @Column({ type: DataType.STRING })
    color!: string | null

    @AllowNull(false)
    @Index
    @Column({ field: 'is_active', type: DataType.BOOLEAN, defaultValue: false })
    isActive!: boolean

    @ForeignKey(() => User)
    @AllowNull(false)
    @Index
    @Column({ field: 'owner_id', type: DataType.BIGINT })
    ownerId!: number

    @BelongsTo(() => User, { as: 'owner' })
    owner!: User

    @HasOne(() => DbConnection, {
        as: 'dbConnection',
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    dbConnection!: DbConnection
}
