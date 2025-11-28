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
    Index, 
    BeforeValidate,
    HasMany
} from 'sequelize-typescript'
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize'
import { AuthProvider, UserRole, UserStatus } from '../../enums/users/user.enum.js'
import Project from '../projects/project.model.js'

@Table({
    tableName: 'users',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['provider', 'oauth_sub'] },
        { fields: ['status'] },
    ],
})
export default class User extends Model<
    InferAttributes<User>,          
    InferCreationAttributes<User>    
> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    declare id: CreationOptional<number>

    @AllowNull(false)
    @Unique
    @Index
    @Column(DataType.STRING)
    declare email: string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare username: string | null

    @AllowNull(true)
    @Column({ field: 'password_hash', type: DataType.STRING })
    declare passwordHash: string | null

    @AllowNull(false)
    @Default(AuthProvider.LOCAL)
    @Index
    @Column(DataType.ENUM(...Object.values(AuthProvider)))
    declare provider: AuthProvider

    @AllowNull(true)
    @Index
    @Column({ field: 'oauth_sub', type: DataType.STRING })
    declare oauthSub: string | null

    @AllowNull(false)
    @Default(UserStatus.PENDING)
    @Index
    @Column(DataType.ENUM(...Object.values(UserStatus)))
    declare status: UserStatus

    @AllowNull(false)
    @Default(UserRole.USER)
    @Column(DataType.ENUM(...Object.values(UserRole)))
    declare role: UserRole

    @AllowNull(true)
    @Column({ field: 'reset_token_hash', type: DataType.STRING })
    declare resetTokenHash: string | null

    @AllowNull(true)
    @Column({ field: 'verification_token_hash', type: DataType.STRING })
    declare verificationTokenHash: string | null
    
    @HasMany(() => Project, {
        as: 'projects',
        foreignKey: 'ownerId',
        onDelete: 'CASCADE',
        hooks: true,
    })
    declare projects?: Project[]

    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>

    @BeforeValidate
    static normalizeEmail(instance: User) {
        if(instance.email) instance.email = instance.email.trim().toLowerCase()
    }

    toSafeJSON() {
        const { passwordHash, resetTokenHash, verificationTokenHash, ...rest } =
            this.get({ plain: true }) as any
        return rest
    }
}
