const { Model, DataTypes } = require('sequelize')
const sequelize = require('../database')

class Role extends Model {}

Role.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  }
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'roles',
  timestamps: true
})

module.exports = Role 