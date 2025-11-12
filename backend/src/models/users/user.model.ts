import {
    Table, Model, Column, DataType, PrimaryKey, AutoIncrement, AllowNull,
    Default, Unique, HasMany, BeforeValidate, Index
} from 'sequelize-typescript'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'

@Table({
    tableName: 'users',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['provider', 'oauth_sub'] },
        { fields: ['status'] },
    ],
})
export default class User extends Model<User> {
    @PrimaryKey
    @AutoIncrement
    @Column({ type: DataType.BIGINT })
    id!: number

    @AllowNull(false)
    @Unique
    @Index
    @Column({ type: DataType.STRING })
    email!: string

    @AllowNull(true)
    @Column({ type: DataType.STRING })
    passwordHash!: string | null

    @AllowNull(false)
    @Default(AuthProvider.LOCAL)
    @Column(DataType.ENUM(...Object.values(AuthProvider)))
    provider!: AuthProvider

    @AllowNull(true)
    @Column({ type: DataType.STRING })
    oauthSub!: string | null

    @AllowNull(false)
    @Default(UserStatus.PENDING)
    @Column(DataType.ENUM(...Object.values(UserStatus)))
    status!: UserStatus

    @AllowNull(false)
    @Default(UserRole.USER)
    @Column(DataType.ENUM(...Object.values(UserRole)))
    role!: UserRole

    @AllowNull(true)
    @Column(DataType.STRING)
    resetTokenHash!: string | null

    @AllowNull(true)
    @Column(DataType.STRING)
    verificationTokenHash!: string | null

    @BeforeValidate
    static normalizeEmail(instance: User) {
        if (instance.email) instance.email = instance.email.trim().toLowerCase()
    }

    toSafeJSON() {
        const { passwordHash, resetTokenHash, verificationTokenHash, ...rest } = this.get({ plain: true }) as any
        return rest
    }
}
