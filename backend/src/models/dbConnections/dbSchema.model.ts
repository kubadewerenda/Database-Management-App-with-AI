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
    Unique,
} from 'sequelize-typescript'
import DbConnection from './dbConnection.model.js'
import { DbSchemaSnapshot } from '../../types/dbConnections/dbConnection.type.js'

@Table({
    tableName: 'db_schema',
    timestamps: true,
    indexes: [{ unique: true, fields: ['connection_id'] }],
})
export default class DbSchema extends Model<DbSchema> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => DbConnection)
    @AllowNull(false)
    @Unique
    @Column({ field: 'connection_id', type: DataType.BIGINT })
    connectionId!: number

    @AllowNull(false)
    @Column({ field: 'refreshed_at', type: DataType.DATE })
    refreshedAt!: Date

    @AllowNull(false)
    @Column({ field: 'tables', type: DataType.JSONB })
    tables!: DbSchemaSnapshot['tables']

    @BelongsTo(() => DbConnection, {
        as: 'connection',
    })
    connection!: DbConnection
}
