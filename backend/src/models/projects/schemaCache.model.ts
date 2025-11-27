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
import DbConnection from './connection.model.js'
import type { DbSchemaSnapshot } from '../../types/schemaCache/schemaCache.js'

@Table({
    tableName: 'schema_cache',
    timestamps: true,
    indexes: [{ unique: true, fields: ['connection_id'] }],
})
export default class SchemaCache extends Model<SchemaCache> {
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
