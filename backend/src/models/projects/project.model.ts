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
    HasMany,
} from 'sequelize-typescript'
import User from '../users/user.model.js'
import DbConnection from './connection.model.js'
import Chat from '../chat/chat.model.js'
import Executor from '../executors/executor.model.js'
import SavedQuery from '../queries/savedQuery.model.js'
import Tag from '../queries/tag.model.js'

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
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    dbConnection!: DbConnection

    @HasMany(() => Chat, {
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    chat!: Chat

    @HasMany(() => Executor, {
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    executors!: Executor[]

    @HasMany(() => SavedQuery, {
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    savedQueries!: SavedQuery[]

    @HasMany(() => Tag, {
        foreignKey: 'projectId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    tags!: Tag[]
}
