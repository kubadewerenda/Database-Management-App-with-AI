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
    BelongsTo
} from 'sequelize-typescript'

@Table({ tableName: 'users', timestamps: true })
export default class User extends Model<User>{
}

