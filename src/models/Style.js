const { DataTypes } = require('sequelize');
const db = require('../database');
const Industry = require('./Industry');

const Style = db.define('Style', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Styles',
      key: 'id'
    },
    field: 'parent_id'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Industries',
      key: 'id'
    },
    field: 'industry_id'
  }
}, {
  tableName: 'Styles',
  timestamps: true,
  underscored: true
});

// 添加与 Industry 的关联关系
Style.belongsTo(Industry, { foreignKey: 'industryId', as: 'industry' });

module.exports = Style; 