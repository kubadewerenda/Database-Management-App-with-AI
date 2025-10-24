import {
    Table, 
    Model, 
    Column, 
    DataType, 
    PrimaryKey, 
    AutoIncrement,
    AllowNull, 
    Default, 
    Unique, 
    HasMany, 
    BeforeValidate,
    ForeignKey,
    BelongsTo,
    Index
} from 'sequelize-typescript'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum'

@Table({ 
    tableName: 'users',
    timestamps: true, 
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['provider', 'oauthSub'] },
        { fields: ['status'] },
    ] 
})
export default class User extends Model<User>{
    @PrimaryKey
    @AutoIncrement
    @Column({ type: DataType.BIGINT })
    id!: number

    @Unique
    @AllowNull(false)
    @Index
    @Column({ type: DataType.STRING(254) })
    email!: string

    @AllowNull(false)
    @Column({ type: DataType.STRING(100) })
    passwordHash!: string

    @AllowNull(true)
    @Column({ type: DataType.STRING(120) })
    name!: string | null

    @AllowNull(false)
    @Default('local')
    @Column(DataType.ENUM('local', 'google'))
    provider!: AuthProvider

    @AllowNull(true)
    @Column({ type: DataType.STRING(190) })
    oauthSub!: string | null

    @AllowNull(false)
    @Default('user')
    @Column(DataType.ENUM('user', 'admin'))
    role!: UserRole

    @AllowNull(false)
    @Default('active')
    @Column(DataType.ENUM('active', 'disabled'))
    status!: UserStatus

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isVerified!: boolean

    @AllowNull(true)
    @Column({ type: DataType.STRING(120) })
    verificationTokenHash!: string | null

    @AllowNull(true)
    @Column({ type: DataType.STRING(120) })
    resetTokenHash!: string | null

    @AllowNull(true)
    @Column(DataType.DATE)
    resetTokenExpiresAt!: Date | null

    @AllowNull(true)
    @Column(DataType.DATE)
    lastLoginAt!: Date | null

    @AllowNull(false)
    @Default({
        sqlDefaultLimit: 100,
        readOnlyMode: true,
        locale: 'pl-PL',
    })
    @Column(DataType.JSONB)
    preferences!: {
        sqlDefaultLimit: number,
        readOnlyMode: boolean,
        locale?: string,
    }

    // @HasMany(() => Project)
    // projects!: Project[]

    @BeforeValidate
    static normalizeEmail(instance: User) {
        if (instance.email) instance.email = instance.email.trim().toLowerCase()
    }

    toSafeJSON() {
        const { passwordHash, resetTokenHash, verificationTokenHash, ...rest } = this.get({ plain: true }) as any
        return rest
    }
}

