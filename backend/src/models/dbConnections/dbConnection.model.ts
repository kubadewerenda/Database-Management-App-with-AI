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
    Default,
    Index,
} from 'sequelize-typescript'
import Project from '../projects/project.model'
import DbSchema from './dbSchema.model'
import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'

@Table({
    tableName: 'db_connections',
    timestamps: true,
    indexes: [
        { fields: ['project_id', 'db_type'] },
        { unique: true, fields: ['project_id'] },
    ],
})
export default class DbConnection extends Model<DbConnection> {
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
    host!: string

    @AllowNull(false)
    @Default(5432)
    @Column(DataType.INTEGER)
    port!: number

    @AllowNull(false)
    @Column(DataType.STRING)
    database!: string

    @AllowNull(false)
    @Column(DataType.STRING)
    username!: string

    @AllowNull(false)
    @Column(DataType.TEXT)
    passwordEnc!: string

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    readOnly!: boolean

    @AllowNull(false)
    @Default(DbType.POSTGRES)
    @Index
    @Column({field: 'db_type', type: DataType.ENUM(...Object.values(DbType))})
    dbType!: DbType

    @BelongsTo(() => Project, {
        as: 'project', 
    })
    project!: Project

    @HasOne(() => DbSchema, {
        foreignKey: 'connectionId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    dbSchema!: DbSchema
}
