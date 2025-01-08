const { Model, DataTypes } = require('sequelize')
const sequelize = require('../database')

class Brand extends Model {}

Brand.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '品牌名称'
  },
  industryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属行业ID',
    references: {
      model: 'industries',
      key: 'id'
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '地址'
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '联系人'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '联系方式'
  },
  remark: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '备注'
  }
}, {
  sequelize,
  modelName: 'Brand',
  tableName: 'brands',
  timestamps: true
})

module.exports = Brand 