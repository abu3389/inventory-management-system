const { Model, DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../database')

class User extends Model {
  static async isFirstUser() {
    const count = await this.count()
    return count === 0
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.password)
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      const hash = bcrypt.hashSync(value, 10);
      this.setDataValue('password', hash);
    }
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Roles',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // 1: 正常, 0: 冻结
    comment: '用户状态：1-正常，0-冻结'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true
})

module.exports = User 