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
import Project from './project.model.js'
import SchemaCache from './schemaCache.model.js'
import { DbType } from '../../enums/dbConnection/dbConnection.enum.js'

@Table({
    tableName: 'db_connections',
    timestamps: true,
    indexes: [
        { fields: ['project_id', 'db_type'] },
        { unique: true, fields: ['project_id', 'name'] },
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

    // TODO: wywalic na final
    @AllowNull(true)
    @Column(DataType.STRING)
    name!: string | null

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

    @HasOne(() => SchemaCache, {
        foreignKey: 'connectionId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    schemaCache!: SchemaCache
}
