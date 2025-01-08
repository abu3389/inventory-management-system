const { DataTypes } = require('sequelize');
const db = require('../database');

const Sku = db.define('Sku', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'SKU名称'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'SKU编号'
  },
  styleCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '款号'
  }
}, {
  tableName: 'skus',
  timestamps: true,
  underscored: true
});

module.exports = Sku; 