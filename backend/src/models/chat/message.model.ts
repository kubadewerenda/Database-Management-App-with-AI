import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    ForeignKey, BelongsTo, Index
} from 'sequelize-typescript'
import Chat from './chat.model.js'
import { ChatRole } from '../../enums/messages/messages.enum.js'

@Table({
    tableName: 'messages',
    timestamps: true,
    indexes: [{ fields: ['chat_id'] }, { fields: ['role'] }],
})
export default class Message extends Model<Message> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number

    @ForeignKey(() => Chat)
    @AllowNull(false)
    @Index
    @Column({ field: 'chat_id', type: DataType.BIGINT })
    chatId!: number

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(ChatRole)))
    role!: ChatRole

    @AllowNull(false)
    @Column(DataType.TEXT)
    content!: string

    @AllowNull(true)
    @Column({ type: DataType.TEXT, field: 'sql_draft' })
    sqlDraft!: string | null

    @BelongsTo(() => Chat, { as: 'chat' })
    chat!: Chat
}
